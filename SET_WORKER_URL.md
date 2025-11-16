# Fix: Set WORKER_URL to Use Deployed Durable Objects

## The Problem

Durable Objects metrics show zero because `WORKER_URL` is not set in your environment.

## The Fix

Add this to your `.env.local` file:

```bash
WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
```

## Steps

1. **Open `.env.local` in your project root**

2. **Add or update this line:**
   ```bash
   WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
   ```

3. **Restart Next.js:**
   ```bash
   # Stop current dev server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

4. **Verify it's working:**
   - Check browser console for: `✅ Using Cloudflare Durable Objects`
   - Check Network tab for requests to `ccsf-tutoring-ai-agent.aoo13.workers.dev`
   - Use chat interface - metrics should start appearing in Cloudflare dashboard

## What Was Happening

**Before (WORKER_URL not set):**
```
Next.js API Route
  ↓
Tries to connect to: localhost:8787 (default)
  ↓
Connection fails (no local Worker)
  ↓
Returns 503 error
  ↓
Falls back to localStorage
  ↓
❌ No requests reach deployed Worker
❌ Durable Objects never called
❌ Metrics = 0
```

**After (WORKER_URL set):**
```
Next.js API Route
  ↓
Proxies to: https://ccsf-tutoring-ai-agent.aoo13.workers.dev
  ↓
Deployed Worker receives request
  ↓
Routes to Durable Object
  ↓
✅ Requests reach Durable Objects
✅ Metrics start appearing
✅ Data stored in Cloudflare
```

## Verify It's Working

### 1. Check Next.js Console
After restarting, you should see:
```
[Durable Objects] Proxying to Worker: https://ccsf-tutoring-ai-agent.aoo13.workers.dev
```

If you see this warning instead:
```
⚠️  WORKER_URL not set! Defaulting to localhost:8787...
```
Then the environment variable isn't loaded yet - restart Next.js.

### 2. Check Browser Console
After using chat, you should see:
```
✅ Using Cloudflare Durable Objects for chat state
✅ Saving state to Cloudflare Durable Objects
```

### 3. Check Network Tab
Look for requests to:
```
https://ccsf-tutoring-ai-agent.aoo13.workers.dev/api/chat/session/...
```

### 4. Check Cloudflare Dashboard
After using chat for a few minutes:
- **Requests** > 0
- **Instances** > 0 (after creating chat sessions)
- **Storage Operations** > 0

## Full .env.local Example

```bash
# Cloudflare D1 Database
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ACCOUNT_ID=d579ae1826963504bbd94f25586ffc69

# Cloudflare Worker (for Durable Objects)
WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev

# OpenAI (if using)
OPENAI_API_KEY=your-openai-key-here
```

## After Setting WORKER_URL

1. ✅ Next.js will proxy all Durable Object requests to deployed Worker
2. ✅ Durable Objects will be created and used in your Cloudflare account
3. ✅ Metrics will start appearing in Cloudflare dashboard
4. ✅ Chat data will persist in Cloudflare (not just localStorage)
5. ✅ Data survives browser refreshes and is shared across devices

