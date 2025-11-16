# Test Embeddings Upload Locally

## Step-by-Step Instructions

### Step 1: Start the Worker (Terminal 1)

**Important:** Vectorize bindings only work when running remotely on Cloudflare.

Open a terminal and run:

```bash
cd /Users/aungnandaoo/Desktop/ccsf_tutoring_ai_agent
wrangler dev worker-upload-embeddings.ts --config wrangler-upload.toml --remote
```

The `--remote` flag makes it run on Cloudflare's infrastructure so Vectorize works.

You should see output like:
```
⬣ Listening on http://localhost:8787
```

**Keep this terminal running!**

### Step 2: Test the Upload (Terminal 2)

Open a **new terminal** and run:

```bash
curl -X POST http://localhost:8787/upload
```

### Step 3: Check the Response

You should see a JSON response like:

```json
{
  "success": true,
  "message": "Successfully uploaded 4 embeddings to Cloudflare Vectorize",
  "count": 4,
  "index": "ccsf-tutors-index"
}
```

### Step 4: Verify in Cloudflare

After successful upload, verify:

```bash
wrangler vectorize get ccsf-tutors-index
```

## Troubleshooting

### "Connection refused"
- Make sure the worker is running in Terminal 1
- Check that it says "Listening on http://localhost:8787"

### "OpenAI API error"
- Make sure you set the secret: `wrangler secret put OPENAI_API_KEY`
- Check it's set: `wrangler secret list`

### "Vectorize index not found"
- Make sure index exists: `wrangler vectorize list`
- Create it: `wrangler vectorize create ccsf-tutors-index --dimensions=1536 --metric=cosine`

## What Happens

1. Worker generates embeddings for all 4 tutors using OpenAI
2. Uploads them to Cloudflare Vectorize index `ccsf-tutors-index`
3. Returns success message with count

Once successful, your embeddings are stored in Cloudflare Vectorize! 🎉

