# How to Verify Embeddings are Stored in Cloudflare Vectorize

## Current Status

**Important:** The current `npm run seed:embeddings` command stores embeddings in a **mock in-memory Vectorize** (for local development). To store in **actual Cloudflare Vectorize**, you need to use one of the methods below.

## Method 1: Verify Index Exists (Quick Check)

```bash
# List all indexes
wrangler vectorize list

# Get index details
wrangler vectorize get ccsf-tutors-index
```

This shows the index exists but **doesn't show vector count** (Cloudflare doesn't expose this via CLI yet).

## Method 2: Store Embeddings via Cloudflare Workers

The best way to store embeddings in Cloudflare Vectorize is through a Cloudflare Worker. Here's how:

### Step 1: Create a Worker Script

Create `scripts/upload-to-vectorize.ts` that will be deployed as a Worker:

```typescript
// This would be deployed as a Cloudflare Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Access Vectorize via env.VECTORIZE_INDEX
    const index = env.VECTORIZE_INDEX;
    
    // Store embeddings here
    await index.upsert([...]);
    
    return new Response('OK');
  }
}
```

### Step 2: Deploy and Run

```bash
# Deploy the worker
wrangler deploy

# Call the worker to upload embeddings
curl https://your-worker.workers.dev/upload-embeddings
```

## Method 3: Use Cloudflare REST API (Advanced)

You can use the Cloudflare API directly, but it requires authentication tokens.

## Method 4: Verify via Query (Best Method)

The most reliable way to verify embeddings are stored is to **query the index**:

### Create a Test Query Script

```typescript
// scripts/test-vectorize-query.ts
import { generateQueryEmbedding } from '../lib/embeddings';

// Generate a test query embedding
const queryEmbedding = await generateQueryEmbedding('Python');

// Query Vectorize (in production, this would use env.VECTORIZE_INDEX)
const results = await index.query(queryEmbedding, { topK: 5 });

console.log('Query results:', results);
// If you get results, embeddings are stored!
```

## Method 5: Check in Production (Recommended)

When you deploy to Cloudflare Workers:

1. **Deploy your Worker** with Vectorize binding
2. **Call the `/api/embeddings/seed` endpoint** from your deployed Worker
3. **Test a search** - if RAG works, embeddings are stored!

## Current Implementation

### Development (Local)
- Uses **mock Vectorize** (in-memory)
- Embeddings stored in `globalThis.vectorizeIndex`
- Lost when process restarts
- Good for testing locally

### Production (Cloudflare Workers)
- Uses **real Cloudflare Vectorize**
- Embeddings stored in `ccsf-tutors-index`
- Persistent across deployments
- Accessible via `env.VECTORIZE_INDEX` in Workers

## How to Store in Real Cloudflare Vectorize

### Option A: Via API Endpoint (When Deployed)

1. Deploy your Next.js app or create a Cloudflare Worker
2. Call the `/api/embeddings/seed` endpoint
3. The endpoint will use `env.VECTORIZE_INDEX` (real Vectorize)

### Option B: Via Worker Script

Create a one-time Worker script to upload embeddings:

```typescript
// worker-upload.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    // Get tutors
    const tutors = await getAllTutors();
    
    // Generate embeddings
    const vectors = await Promise.all(
      tutors.map(async (tutor) => ({
        id: `tutor-${tutor.id}`,
        values: await generateTutorEmbedding(tutor),
        metadata: { tutorId: tutor.id, name: tutor.name }
      }))
    );
    
    // Store in Vectorize
    await env.VECTORIZE_INDEX.upsert(vectors);
  }
}
```

## Verification Checklist

- [ ] Index exists: `wrangler vectorize list` shows `ccsf-tutors-index`
- [ ] Index has correct dimensions: 1536
- [ ] Index has correct metric: cosine
- [ ] Embeddings generated: `npm run seed:embeddings` succeeds
- [ ] **In Production:** Query returns results (embeddings stored)
- [ ] **In Production:** RAG matching works (embeddings working)

## Quick Test

To quickly verify if embeddings work in production:

1. Deploy to Cloudflare Workers
2. Try a search query: "I need Python help"
3. If RAG returns good matches, embeddings are stored and working! ✅

## Notes

- **Local development** uses mock Vectorize (embeddings not in Cloudflare)
- **Production** uses real Cloudflare Vectorize (embeddings stored in Cloudflare)
- The index exists in Cloudflare, but vectors are only stored when you:
  - Deploy and call the API endpoint, OR
  - Run a Worker script that uses `env.VECTORIZE_INDEX`
