# Debug: Why Durable Objects Metrics Show Zero

## Problem
Durable Objects metrics show all zeros even though you're using the chat interface.

## Possible Causes

### 1. **Not Using Deployed Worker** (Most Likely)
Your Next.js app might be falling back to localStorage instead of calling the deployed Worker.

### 2. **Worker URL Not Set**
The `WORKER_URL` environment variable might not be configured.

### 3. **CORS or Network Issues**
Requests might be failing due to CORS or network errors.

### 4. **Wrong Worker URL**
The Worker URL might be incorrect or pointing to the wrong endpoint.

## Quick Debug Steps

### Step 1: Check Environment Variables

Check if `WORKER_URL` is set in your `.env.local`:

```bash
# Should have this:
WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
```

### Step 2: Check Browser Console

Open browser DevTools → Console tab. Look for:

**✅ Using Durable Objects:**
```
✅ Using Cloudflare Durable Objects for chat state
✅ Saving state to Cloudflare Durable Objects
```

**❌ Using localStorage fallback:**
```
⚠️ Durable Objects Worker not running. Using localStorage fallback.
```

### Step 3: Check Network Tab

Open browser DevTools → Network tab:

1. Filter by "Fetch/XHR"
2. Send a message in chat
3. Look for requests to:
   - ✅ **Deployed Worker**: `ccsf-tutoring-ai-agent.aoo13.workers.dev`
   - ❌ **Local Worker**: `localhost:8787`
   - ❌ **localStorage fallback**: Only `/api/chat/session/...` with 503 errors

### Step 4: Test Worker Directly

Test if your deployed Worker is accessible:

```bash
curl https://ccsf-tutoring-ai-agent.aoo13.workers.dev/health
```

Should return:
```json
{"status":"ok","service":"ccsf-tutoring-ai-agent"}
```

### Step 5: Test Durable Object Endpoint

Test if Durable Objects are accessible:

```bash
# Test getting state (will create a Durable Object instance)
curl https://ccsf-tutoring-ai-agent.aoo13.workers.dev/api/chat/session/test-session-123
```

Should return JSON with chat state or initialize new state.

## Fix: Ensure Using Deployed Worker

### Option A: Set Environment Variable

Add to `.env.local`:
```bash
WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
```

Then restart Next.js:
```bash
npm run dev
```

### Option B: Check Proxy Logic

Verify your API route is correctly proxying:

```typescript
// app/api/chat/session/[sessionId]/route.ts
function getWorkerUrl(): string {
  return process.env.WORKER_URL || 
         process.env.NEXT_PUBLIC_WORKER_URL || 
         'http://localhost:8787';
}
```

If `WORKER_URL` is not set, it defaults to `localhost:8787`, which won't work if you're not running `wrangler dev`.

## Verify Durable Objects Are Being Used

### Method 1: Browser Console

After sending a chat message, check console for:
- ✅ `✅ Using Cloudflare Durable Objects` = Working!
- ❌ `⚠️ Durable Objects Worker not running` = Not working

### Method 2: Network Tab

Check Network tab for requests:
- ✅ Requests to `ccsf-tutoring-ai-agent.aoo13.workers.dev` = Using deployed Worker
- ❌ Only requests to `/api/chat/session/...` with 503 = Using localStorage fallback

### Method 3: Cloudflare Dashboard

After using the app for a few minutes:
- ✅ **Instances > 0** = Durable Objects are being created
- ✅ **Requests > 0** = Durable Objects are being called
- ❌ **All zeros** = Not using Durable Objects

## Common Issues

### Issue 1: Environment Variable Not Loaded

**Problem:** Next.js might not be reading `.env.local`

**Fix:**
1. Ensure `.env.local` is in project root
2. Restart Next.js dev server (`npm run dev`)
3. Check if variable is actually set:
   ```typescript
   console.log('WORKER_URL:', process.env.WORKER_URL);
   ```

### Issue 2: CORS Errors

**Problem:** Browser blocks requests to deployed Worker

**Fix:** Add CORS headers to Worker response (already should be handled, but check)

### Issue 3: Worker Not Responding

**Problem:** Deployed Worker might be down or erroring

**Fix:**
1. Test Worker health endpoint
2. Check Worker logs in Cloudflare dashboard
3. Check for deployment errors

### Issue 4: Wrong API Path

**Problem:** Next.js API route might not be matching Worker route

**Fix:** Ensure Worker route matches:
```typescript
// Worker: src/index.ts
if (path.startsWith('/api/chat/session/')) {
  // Handle Durable Object request
}
```

## Quick Fix Checklist

- [ ] Set `WORKER_URL` in `.env.local`
- [ ] Restart `npm run dev`
- [ ] Check browser console for ✅ or ⚠️ messages
- [ ] Check Network tab for requests to deployed Worker
- [ ] Test Worker health endpoint directly
- [ ] Wait a few minutes and check Cloudflare dashboard again
- [ ] Send multiple chat messages to create instances

## Expected Behavior

### When Working Correctly:

1. **Browser Console:**
   ```
   ✅ Using Cloudflare Durable Objects for chat state
   ✅ Saving state to Cloudflare Durable Objects
   ```

2. **Network Tab:**
   - Requests to `ccsf-tutoring-ai-agent.aoo13.workers.dev/api/chat/session/...`
   - Status 200 OK

3. **Cloudflare Dashboard:**
   - Requests > 0
   - Instances > 0 (after creating chat sessions)
   - Storage Operations > 0

4. **Chat Interface:**
   - Messages persist after page refresh
   - Works across browser tabs

## Still Not Working?

1. **Check Worker logs:**
   - Cloudflare Dashboard → Workers & Pages → Your Worker → Logs

2. **Check for errors:**
   - Browser console
   - Network tab errors
   - Worker logs

3. **Verify deployment:**
   ```bash
   wrangler deployments list
   ```

4. **Test directly:**
   ```bash
   # Test Worker
   curl https://ccsf-tutoring-ai-agent.aoo13.workers.dev/health
   
   # Test Durable Object
   curl https://ccsf-tutoring-ai-agent.aoo13.workers.dev/api/chat/session/test-123
   ```

