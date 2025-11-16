# Quick Start: Store Embeddings in Cloudflare Vectorize

## ✅ Step-by-Step Guide

### Step 1: Set Your OpenAI API Key

```bash
wrangler secret put OPENAI_API_KEY
```
Enter your API key when prompted.

### Step 2: Test Locally (Optional but Recommended)

```bash
# Run the worker locally
wrangler dev worker-upload-embeddings.ts
```

In another terminal:
```bash
# Upload embeddings
curl -X POST http://localhost:8787/upload
```

You should see:
```json
{
  "success": true,
  "message": "Successfully uploaded 4 embeddings to Cloudflare Vectorize",
  "count": 4,
  "index": "ccsf-tutors-index"
}
```

### Step 3: Deploy the Worker

```bash
wrangler deploy worker-upload-embeddings.ts
```

### Step 4: Upload Embeddings to Cloudflare

After deployment, you'll get a URL like `https://worker-upload-embeddings.your-subdomain.workers.dev`

```bash
# Replace with your actual worker URL
curl -X POST https://your-worker-url.workers.dev/upload
```

**That's it! Your embeddings are now stored in Cloudflare Vectorize!** 🎉

## Verify

```bash
# Check the index
wrangler vectorize get ccsf-tutors-index

# Test your RAG matching - if it works, embeddings are stored!
```

## Troubleshooting

### "No tutors found"
- Make sure `TUTORS` array in `worker-upload-embeddings.ts` has data

### "OpenAI API error"
- Check your API key: `wrangler secret list`
- Set it again: `wrangler secret put OPENAI_API_KEY`

### "Vectorize index not found"
- Make sure index exists: `wrangler vectorize list`
- Create it: `wrangler vectorize create ccsf-tutors-index --dimensions=1536 --metric=cosine`

## Next Steps

Once embeddings are stored:
- ✅ Your RAG system will use real Cloudflare Vectorize
- ✅ Semantic search will work in production
- ✅ Better matching for 20+ tutors

