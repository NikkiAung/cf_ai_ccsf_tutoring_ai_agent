# RAG Implementation Guide

## Overview

This application now uses **RAG (Retrieval-Augmented Generation)** for intelligent tutor matching. RAG combines semantic search with LLM reasoning to provide better matches, especially as the tutor database grows.

## Architecture

```
User Query: "I need help with object-oriented programming in Python"
    ↓
1. Generate Query Embedding (OpenAI text-embedding-3-small)
    ↓
2. Semantic Search (Cloudflare Vectorize)
    - Find top 5 similar tutors by cosine similarity
    ↓
3. Retrieve Top Candidates
    - Get full tutor data for top matches
    ↓
4. LLM Reasoning (OpenAI GPT-4o-mini)
    - Select best match from candidates
    - Provide reasoning
    ↓
5. Return Best Match
```

## Components

### 1. Embeddings (`lib/embeddings.ts`)
- Generates embeddings using OpenAI `text-embedding-3-small`
- Creates comprehensive tutor representations (bio + skills + availability)
- Calculates cosine similarity for matching

### 2. Vectorize (`lib/vectorize.ts`)
- Stores tutor embeddings in Cloudflare Vectorize
- Performs semantic search
- Mock implementation for local development

### 3. AI Matching (`lib/ai.ts`)
- Uses RAG pipeline: semantic search → LLM reasoning
- Falls back to keyword matching if RAG fails
- Returns match with similarity score and reasoning

## Setup

### 1. Create Vectorize Index (Production)

```bash
# Create the index with 1536 dimensions (text-embedding-3-small)
wrangler vectorize create ccsf-tutors-index \
  --dimensions=1536 \
  --metric=cosine
```

### 2. Generate Embeddings

**Option A: Using API endpoint**
```bash
curl -X POST http://localhost:3000/api/embeddings/seed
```

**Option B: Using script**
```bash
npm run seed:embeddings
```

### 3. Environment Variables

Make sure you have:
```env
OPENAI_API_KEY=your-api-key-here
```

## How It Works

### Step 1: User Query Processing
User says: "I need Python help on Monday at 10:00"

The system extracts:
- Skill: "Python"
- Day: "Monday"
- Time: "10:00"

### Step 2: Semantic Search
1. Generate embedding for query: `"Python help, Monday, 10:00"`
2. Search Vectorize for similar tutor embeddings
3. Get top 5 matches ranked by cosine similarity

### Step 3: LLM Reasoning
Send top 5 candidates to LLM with:
- Student requirements
- Candidate tutors with similarity scores
- Availability information

LLM selects best match and provides reasoning.

### Step 4: Return Result
Returns:
- Matched tutor
- Similarity score (0-1)
- Reasoning
- Available time slots

## Benefits of RAG

### Before (Keyword Matching)
- ❌ Only matches exact keywords
- ❌ "Python" ≠ "Python programming"
- ❌ Can't understand context
- ❌ Limited to simple queries

### After (RAG)
- ✅ Semantic understanding
- ✅ "Python" matches "Python programming", "OOP in Python", etc.
- ✅ Understands context and concepts
- ✅ Handles complex queries
- ✅ Scales to 100+ tutors

## Example Queries

### Simple
```
"I need Python help"
→ Finds tutors with Python skills
```

### Complex
```
"I'm struggling with object-oriented programming concepts in Python"
→ Finds tutors who can help with OOP, even if not explicitly mentioned
```

### With Constraints
```
"Python tutor available Monday morning for online session"
→ Semantic search + filters for day/time/mode
```

## Development vs Production

### Development
- Uses **mock Vectorize** (in-memory storage)
- Embeddings generated on-the-fly
- No persistent storage

### Production
- Uses **Cloudflare Vectorize**
- Embeddings stored in Vectorize index
- Fast semantic search
- Scales to millions of vectors

## Updating Embeddings

When you add/update tutors:

1. **Generate new embeddings:**
   ```bash
   npm run seed:embeddings
   ```

2. **Or use API:**
   ```bash
   curl -X POST /api/embeddings/seed
   ```

3. **Embeddings are automatically stored in Vectorize**

## Monitoring

### Check Embedding Quality
- Similarity scores (0-1 range)
- Higher = better match
- Typical good matches: >0.7

### Debugging
- Check console logs for similarity scores
- Review LLM reasoning in responses
- Monitor embedding generation errors

## Performance

### Latency
- Embedding generation: ~200-500ms
- Vector search: ~50-100ms
- LLM reasoning: ~500-1000ms
- **Total: ~1-2 seconds**

### Cost
- Embeddings: ~$0.02 per 1M tokens
- Vectorize: Free tier available
- LLM: ~$0.15 per 1M input tokens

## Troubleshooting

### "No embeddings found"
- Run `npm run seed:embeddings`
- Check Vectorize index exists
- Verify OpenAI API key

### "Low similarity scores"
- Check tutor data quality
- Ensure comprehensive bios
- Review embedding generation

### "RAG falling back to keyword matching"
- Check Vectorize connection
- Verify embeddings are stored
- Review error logs

## Future Enhancements

1. **Hybrid Search**: Combine semantic + keyword search
2. **Re-ranking**: Use LLM to re-rank top candidates
3. **Feedback Loop**: Learn from user selections
4. **Multi-modal**: Add tutor photos/videos to embeddings
5. **Real-time Updates**: Auto-update embeddings when tutors change

## Resources

- [Cloudflare Vectorize Docs](https://developers.cloudflare.com/vectorize/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

