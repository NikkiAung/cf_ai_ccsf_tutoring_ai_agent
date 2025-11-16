# How to Store Embeddings in Cloudflare Vectorize

## Quick Answer

**Yes, but not directly with `wrangler deploy` for Next.js.** Here are your options:

## Option 1: Use the Standalone Worker (Easiest) ⭐

I've created a standalone Worker script that you can use to upload embeddings.

### Step 1: Add Your Tutor Data

Edit `worker-upload-embeddings.ts` and add your tutor data to the `TUTORS` array (or fetch from your database).

### Step 2: Set OpenAI API Key

```bash
wrangler secret put OPENAI_API_KEY
# Enter your API key when prompted
```

### Step 3: Test Locally

```bash
# Run the worker locally
wrangler dev worker-upload-embeddings.ts

# In another terminal, upload embeddings
curl -X POST http://localhost:8787/upload
```

### Step 4: Deploy the Worker

```bash
wrangler deploy worker-upload-embeddings.ts
```

### Step 5: Call the Deployed Endpoint

```bash
curl -X POST https://your-worker.workers.dev/upload
```

**This will store embeddings in Cloudflare Vectorize!** ✅

## Option 2: Deploy Next.js to Cloudflare Pages

If you want to use your Next.js API endpoint:

### Step 1: Install Cloudflare Adapter

```bash
npm install @cloudflare/next-on-pages
```

### Step 2: Update package.json

```json
{
  "scripts": {
    "build": "next build",
    "deploy": "npx @cloudflare/next-on-pages"
  }
}
```

### Step 3: Deploy

```bash
npm run build
npm run deploy
```

### Step 4: Set Secrets

```bash
wrangler secret put OPENAI_API_KEY --name your-pages-project
```

### Step 5: Call API Endpoint

```bash
curl -X POST https://your-pages-project.pages.dev/api/embeddings/seed
```

## Option 3: Quick Test with Wrangler Dev

The fastest way to test right now:

```bash
# 1. Set your OpenAI API key
wrangler secret put OPENAI_API_KEY

# 2. Run the worker locally
wrangler dev worker-upload-embeddings.ts

# 3. Upload embeddings (in another terminal)
curl -X POST http://localhost:8787/upload
```

This uses the **real Cloudflare Vectorize** even in dev mode! ✅

## Verify Embeddings are Stored

After uploading, verify:

```bash
# Check the index
wrangler vectorize get ccsf-tutors-index

# Test a query (if you have a query endpoint)
# Or just test your RAG matching - if it works, embeddings are stored!
```

## Recommended Approach

**Use Option 1 (Standalone Worker)** because:
- ✅ Simple and focused
- ✅ Works immediately
- ✅ Uses real Cloudflare Vectorize
- ✅ Easy to run again when you add tutors

## Next Steps

1. **Edit** `worker-upload-embeddings.ts` - Add your tutor data
2. **Set secret**: `wrangler secret put OPENAI_API_KEY`
3. **Test locally**: `wrangler dev worker-upload-embeddings.ts`
4. **Upload**: `curl -X POST http://localhost:8787/upload`
5. **Deploy**: `wrangler deploy worker-upload-embeddings.ts`

That's it! Your embeddings will be stored in Cloudflare Vectorize. 🎉

