# How to Store Embeddings in Cloudflare Vectorize

## Important Distinction

### Current Status
- ✅ **Index exists** in Cloudflare: `ccsf-tutors-index`
- ❌ **Index is empty** (no vectors stored yet)
- ✅ **Embeddings generated locally** (stored in mock Vectorize)

### Why?
The `npm run seed:embeddings` command uses a **mock Vectorize** for local development. To store in **real Cloudflare Vectorize**, you need to deploy and use the API.

## Method 1: Deploy and Use API Endpoint (Easiest)

### Step 1: Deploy to Cloudflare Workers

```bash
# Make sure wrangler.toml is configured
wrangler deploy
```

### Step 2: Set OpenAI API Key Secret

```bash
wrangler secret put OPENAI_API_KEY
# Enter your API key when prompted
```

### Step 3: Call the API Endpoint

```bash
# After deployment, call the seed endpoint
curl -X POST https://your-worker.workers.dev/api/embeddings/seed
```

This will:
- Generate embeddings using OpenAI
- Store them in **real Cloudflare Vectorize** via `env.VECTORIZE_INDEX`
- Return success message

### Step 4: Verify

Try a search query - if RAG works, embeddings are stored! ✅

## Method 2: Test Locally with Wrangler Dev

### Step 1: Create a Test Worker

Create `test-upload.ts`:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.url.endsWith('/upload')) {
      // Get tutors and generate embeddings
      const tutors = await getAllTutors();
      const vectors = await Promise.all(
        tutors.map(async (tutor) => ({
          id: `tutor-${tutor.id}`,
          values: await generateTutorEmbedding(tutor),
          metadata: { tutorId: tutor.id, name: tutor.name }
        }))
      );
      
      // Store in Vectorize
      await env.VECTORIZE_INDEX.upsert(vectors);
      
      return new Response(`Uploaded ${vectors.length} vectors`);
    }
    return new Response('OK');
  }
}
```

### Step 2: Run with Wrangler Dev

```bash
wrangler dev test-upload.ts
```

### Step 3: Call the Endpoint

```bash
curl http://localhost:8787/upload
```

## Method 3: Verify Embeddings are Stored

### Check Index Status

```bash
# List indexes
wrangler vectorize list

# Get index details
wrangler vectorize get ccsf-tutors-index
```

**Note:** Cloudflare CLI doesn't show vector count yet, but you can verify by:

### Test with a Query

1. Generate a test query embedding
2. Query the index
3. If you get results, embeddings are stored!

```typescript
// In your deployed Worker
const queryEmbedding = await generateQueryEmbedding('Python');
const results = await env.VECTORIZE_INDEX.query(queryEmbedding, { topK: 5 });

console.log('Results:', results);
// If results.matches.length > 0, embeddings are stored! ✅
```

## Current Implementation Details

### Development (Local)
```typescript
// lib/vectorize.ts
export function getVectorizeIndex(): VectorizeIndex {
  // Returns MockVectorizeIndex (in-memory)
  return new MockVectorizeIndex();
}
```

### Production (Cloudflare Workers)
```typescript
// In your Worker
export default {
  async fetch(request: Request, env: Env) {
    // env.VECTORIZE_INDEX is the real Cloudflare Vectorize
    const index = env.VECTORIZE_INDEX;
    await index.upsert(vectors); // Stores in Cloudflare!
  }
}
```

## Quick Verification Checklist

- [ ] Index exists: `wrangler vectorize list` shows `ccsf-tutors-index`
- [ ] Index configured: 1536 dimensions, cosine metric
- [ ] Deployed to Cloudflare Workers
- [ ] API endpoint called: `POST /api/embeddings/seed`
- [ ] Test query works: RAG returns results ✅

## Summary

**To store embeddings in Cloudflare Vectorize:**

1. **Deploy** your app to Cloudflare Workers
2. **Call** the `/api/embeddings/seed` endpoint
3. **Verify** by testing a search query

The embeddings will be stored in the real `ccsf-tutors-index` in Cloudflare! 🎉

