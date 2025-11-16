# Where is the RAG Pipeline Used?

## Overview

The RAG (Retrieval-Augmented Generation) pipeline is used in **2 main places**:

1. **Single Tutor Matching** (`/api/match`) - Returns the best match
2. **Multiple Tutor Matching** (`/api/tutors/match-all`) - Returns all matching tutors

## Flow Diagram

```
User Input: "I need help with Python"
    ↓
ChatInterface.tsx (extracts: skill="Python")
    ↓
POST /api/match
    ↓
lib/ai.ts → matchTutor()
    ↓
┌─────────────────────────────────────┐
│  RAG PIPELINE STARTS HERE           │
└─────────────────────────────────────┘
    ↓
Step 1: lib/vectorize.ts → searchSimilarTutors()
    ├─ Generate query embedding (OpenAI)
    ├─ Search Cloudflare Vectorize
    └─ Return top 5 similar tutors (by cosine similarity)
    ↓
Step 2: lib/ai.ts → Get tutor objects
    ├─ Map tutor IDs to full tutor data
    └─ Filter to top 5 candidates
    ↓
Step 3: lib/ai.ts → LLM Reasoning (OpenAI GPT)
    ├─ Create prompt with top candidates
    ├─ Ask LLM to select best match
    └─ Return match with reasoning
    ↓
Response: MatchTutorResponse
```

## Code Locations

### 1. Main RAG Function: `lib/ai.ts`

**File:** `lib/ai.ts`  
**Function:** `matchTutor()`

```typescript
// Line 13-148
export async function matchTutor(
  tutors: Tutor[],
  request: MatchTutorRequest
): Promise<MatchTutorResponse | null> {
  // Step 1: Semantic search
  const similarTutors = await searchSimilarTutors(
    request.skill,
    request.day,
    request.time,
    request.mode,
    5 // Top 5 candidates
  );

  // Step 2: Get tutor objects
  const candidateTutors = similarTutors
    .map(result => tutors.find(t => t.id === result.tutorId))
    .filter((t): t is Tutor => t !== undefined);

  // Step 3: LLM reasoning
  const prompt = `...`; // Creates prompt with candidates
  const response = await fetch('https://api.openai.com/v1/chat/completions', ...);
  
  return matchResult;
}
```

### 2. Semantic Search: `lib/vectorize.ts`

**File:** `lib/vectorize.ts`  
**Function:** `searchSimilarTutors()`

```typescript
// Line 173-198
export async function searchSimilarTutors(
  skill: string | string[],
  day?: string,
  time?: string,
  mode?: string,
  topK: number = 5
): Promise<Array<{ tutorId: number; score: number }>> {
  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(skill, day, time, mode);
  
  // Search Vectorize
  const results = await index.query(queryEmbedding, {
    topK,
    returnMetadata: true,
  });
  
  return results.matches.map(match => ({
    tutorId: parseInt(match.metadata?.tutorId),
    score: match.score,
  }));
}
```

### 3. API Endpoint: `/api/match`

**File:** `app/api/match/route.ts`  
**Line:** 47

```typescript
// Line 42-47
// Use RAG-based matching (semantic search + LLM reasoning)
// This will:
// 1. Generate embedding for user query
// 2. Search Vectorize for similar tutors
// 3. Use LLM to select best match from top candidates
const match = await matchTutor(allTutors, body);
```

### 4. API Endpoint: `/api/tutors/match-all`

**File:** `app/api/tutors/match-all/route.ts`  
**Line:** 75

```typescript
// Line 73-81
// Use semantic search to find all matching tutors
const similarTutors = await searchSimilarTutors(
  body.skill,
  body.day,
  body.time,
  body.mode,
  20 // Get top 20 candidates
);
```

## When RAG is Used

### ✅ RAG is Used When:

1. **User searches for a tutor** → `/api/match` endpoint
   - User: "I need help with Python"
   - Calls: `matchTutor()` → Uses RAG pipeline

2. **User asks for "other tutors"** → `/api/tutors/match-all` endpoint
   - User: "Show me other tutors"
   - Calls: `searchSimilarTutors()` → Uses semantic search (part of RAG)

3. **Production environment** → Uses real Cloudflare Vectorize
   - Embeddings stored in `ccsf-tutors-index`
   - Semantic search works with real data

### ❌ RAG is NOT Used When:

1. **Local development without Vectorize** → Falls back to keyword matching
   - If `searchSimilarTutors()` returns 0 results
   - Falls back to `matchTutorSimple()` (keyword-based)

2. **No OpenAI API key** → Uses top semantic match only
   - Skips LLM reasoning step
   - Returns top match from semantic search

## RAG Pipeline Steps (Detailed)

### Step 1: Query Embedding Generation
**Location:** `lib/embeddings.ts` → `generateQueryEmbedding()`

```typescript
// Combines user query into text
const queryText = `
Student needs help with: Python
Preferred day: Monday
Preferred time: 10:00
Preferred mode: online
`;

// Generates 1536-dimensional vector
const embedding = await generateEmbedding(queryText);
```

### Step 2: Vector Search
**Location:** `lib/vectorize.ts` → `searchSimilarTutors()`

```typescript
// Searches Cloudflare Vectorize
const results = await index.query(queryEmbedding, {
  topK: 5,
  returnMetadata: true,
});

// Returns: [{ tutorId: 1, score: 0.85 }, { tutorId: 3, score: 0.78 }, ...]
```

### Step 3: Retrieve Candidates
**Location:** `lib/ai.ts` → `matchTutor()`

```typescript
// Get full tutor data for top candidates
const candidateTutors = similarTutors
  .map(result => tutors.find(t => t.id === result.tutorId))
  .filter((t): t is Tutor => t !== undefined)
  .slice(0, 5);
```

### Step 4: LLM Reasoning
**Location:** `lib/ai.ts` → `matchTutor()`

```typescript
// Creates prompt with top candidates
const prompt = `
Student Requirements:
- Skills needed: Python
- Preferred day: Monday

Top Candidate Tutors:
1. Aung Nanda O [Similarity: 85%]
   - Skills: Python, Java, JavaScript
   - Available: Monday 9:30-10:00
2. Chris H [Similarity: 78%]
   - Skills: Python, Java, SQL
   - Available: Monday 10:00-10:30
...

Please select the best match...
`;

// Calls OpenAI GPT
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});
```

## Fallback Behavior

If RAG fails, the system falls back to **keyword matching**:

```typescript
// lib/ai.ts, line 28-30
if (similarTutors.length === 0) {
  // No semantic matches, fall back to keyword matching
  return matchTutorSimple(tutors, request);
}
```

**Keyword matching** (`matchTutorSimple()`):
- Matches skills by exact keyword
- Scores tutors based on skill/day/time/mode matches
- No semantic understanding
- No LLM reasoning

## Summary

**RAG Pipeline is used in:**
- ✅ `/api/match` - Single tutor matching (full RAG: semantic search + LLM)
- ✅ `/api/tutors/match-all` - Multiple tutor matching (semantic search only)

**RAG Pipeline components:**
1. `lib/embeddings.ts` - Generates embeddings
2. `lib/vectorize.ts` - Stores/search embeddings
3. `lib/ai.ts` - Orchestrates RAG pipeline
4. `app/api/match/route.ts` - API endpoint that uses RAG
5. `app/api/tutors/match-all/route.ts` - API endpoint that uses semantic search

**When it runs:**
- Every time a user searches for a tutor
- Every time a user asks for "other tutors"
- Uses real Cloudflare Vectorize in production
- Falls back to keyword matching if RAG fails

