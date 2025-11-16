# AI Architecture & Input Processing

## Current Implementation (Updated with RAG)

### 1. **User Input Processing** (Regex Extraction + RAG)

**Location:** `components/schedule/ChatInterface.tsx`

**Method:** Regex-based pattern matching

```typescript
// Extract skill from user message
const skillMatch = userMessage.match(/\b(python|java|javascript|react|html|css|linux|sql|c\+\+|mips|assembly|debugging)\b/i);

// Extract day
const dayMatch = userMessage.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

// Extract time
const timeMatch = userMessage.match(/\b(\d{1,2}:\d{2})\b/);

// Extract mode
const modeMatch = userMessage.match(/\b(online|on campus|on-campus)\b/i);
```

**Limitations:**
- Only matches exact keywords
- Doesn't understand synonyms (e.g., "programming" vs "coding")
- Can't handle complex queries like "I need help with data structures in Python"

### 2. **AI Matching** (RAG - Retrieval-Augmented Generation) ✅

**Location:** `lib/ai.ts`

**Method:** OpenAI API with full context in prompt

```typescript
// All tutor data is sent in the prompt
const prompt = `
Student Requirements:
- Skills needed: ${skillsText}
- Preferred day: ${request.day}
...

Available Tutors:
${tutors.map(tutor => `
  ${tutor.name}
  - Skills: ${tutor.skills.join(', ')}
  - Bio: ${tutor.bio}
  ...
`).join('\n')}
`;
```

**How it works (RAG Pipeline):**
1. User input → Regex extraction → Structured request
2. Generate query embedding → Semantic representation
3. Vector search → Find top 5 similar tutors (cosine similarity)
4. Retrieve top candidates → Get full tutor data
5. LLM reasoning → Select best match from candidates
6. Response → Return match with similarity score and reasoning

**Using RAG because:**
- ✅ Scales to 20+ tutors efficiently
- ✅ Semantic understanding (not just keywords)
- ✅ Handles synonyms and related concepts
- ✅ Better matching quality
- ✅ Vector embeddings stored in Cloudflare Vectorize

## Why Not RAG Yet?

**Current approach works because:**
- Small dataset (4 tutors)
- All data fits in one prompt
- Simple matching requirements
- Fast and cost-effective

**RAG would be beneficial when:**
- 50+ tutors
- Complex skill descriptions
- Need semantic understanding
- Want to search by concepts, not keywords

## Future: Implementing RAG with Cloudflare Vectorize

### Architecture Plan

```
User Input: "I need help with object-oriented programming in Python"
    ↓
1. Generate Embedding (OpenAI/Workers AI)
    ↓
2. Vector Search (Cloudflare Vectorize)
    - Find tutors with similar skills/bios
    ↓
3. Retrieve Top Matches
    ↓
4. Send to LLM with Context
    ↓
5. Return Best Match
```

### Implementation Steps

1. **Generate Embeddings:**
   - Use OpenAI embeddings API or Workers AI
   - Embed: tutor bios, skills, availability descriptions

2. **Store in Vectorize:**
   - Create vector index
   - Store tutor embeddings with metadata

3. **Semantic Search:**
   - User query → embedding
   - Vector search → similar tutors
   - Return top N matches

4. **LLM Reasoning:**
   - Send top matches to LLM
   - LLM selects best match
   - Returns reasoning

## Current vs RAG Comparison

### Current (Prompt Engineering)
✅ Simple to implement
✅ Works for small datasets
✅ Fast (no vector search)
✅ Cost-effective
❌ Limited to keyword matching
❌ Doesn't scale well
❌ Can't understand synonyms

### RAG (Future)
✅ Semantic understanding
✅ Handles synonyms
✅ Scales to many tutors
✅ Better matching quality
❌ More complex
❌ Requires vector database
❌ Additional latency

## Recommendations

**For now (4 tutors):**
- Current approach is fine
- Simple and effective
- No need for RAG yet

**When to add RAG:**
- 20+ tutors
- Complex skill descriptions
- Need better matching
- Want semantic search

**Implementation priority:**
1. ✅ Current: Regex + Prompt Engineering (DONE)
2. 🔄 Next: Improve regex patterns
3. 📋 Future: Add embeddings + Vectorize
4. 📋 Future: Implement semantic search

