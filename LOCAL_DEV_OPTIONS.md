# Local Development Options After Deployment

## Quick Answer

**Yes, you have 3 options:**

1. ✅ **Use deployed Worker** (easiest) - Just run `npm run dev`, no wrangler needed
2. ⚡ **Use local Worker** (for testing changes) - Run `wrangler dev --remote` 
3. 💾 **Use localStorage fallback** (no Worker at all) - Just run `npm run dev`

## Option 1: Use Deployed Worker (Recommended for Most Cases)

**What you need:**
```bash
# Just run Next.js, it will use your deployed Worker
npm run dev
```

**Setup (one time):**
Add to your `.env.local`:
```bash
WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
# OR
NEXT_PUBLIC_WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
```

**How it works:**
- ✅ Next.js API routes proxy to your **deployed Worker**
- ✅ Uses **production Durable Objects** (your Cloudflare account)
- ✅ No need to run `wrangler dev`
- ✅ All data persists in Cloudflare
- ⚠️ Uses production resources (fine for development)

**When to use:**
- ✅ Daily development
- ✅ Testing features
- ✅ Most common scenario

**Pros:**
- ✅ Simple - just one command
- ✅ Uses real Durable Objects
- ✅ Data persists across sessions

**Cons:**
- ⚠️ Uses production Worker (but that's usually fine)

---

## Option 2: Use Local Worker (For Testing Worker Changes)

**What you need:**
```bash
# Terminal 1: Run local Worker
wrangler dev src/index.ts --remote

# Terminal 2: Run Next.js
npm run dev
```

**Setup:**
Keep `.env.local` with:
```bash
WORKER_URL=http://localhost:8787
```

**How it works:**
- ✅ Next.js proxies to **local Worker** on port 8787
- ✅ Worker uses **remote Durable Objects** (for testing)
- ✅ You can test Worker code changes before deploying
- ✅ Hot reload for Worker code

**When to use:**
- ✅ When you're **modifying Worker code** (`src/index.ts`)
- ✅ When you're **modifying Durable Object code** (`durable-objects/chat-session.ts`)
- ✅ Testing Worker changes before deploying

**Pros:**
- ✅ Test Worker changes locally
- ✅ Hot reload for Worker code
- ✅ Faster iteration on Worker code

**Cons:**
- ❌ Need to run 2 commands
- ❌ More complex setup

---

## Option 3: Use localStorage Fallback (No Worker)

**What you need:**
```bash
# Just run Next.js, Worker not needed
npm run dev
```

**Setup:**
Don't set `WORKER_URL`, or ensure it's not accessible.

**How it works:**
- ✅ Next.js API routes detect Worker unavailable (503)
- ✅ Automatically falls back to **localStorage**
- ✅ Chat data stored in browser only
- ⚠️ Data lost on browser clear/refresh (sometimes)

**When to use:**
- ✅ Just developing **frontend/UI** (not backend)
- ✅ Quick testing without needing persistence
- ✅ Worker is down/maintenance

**Pros:**
- ✅ Simplest - no Worker needed
- ✅ Fast development

**Cons:**
- ❌ No real Durable Objects
- ❌ Data not in Cloudflare
- ⚠️ Data can be lost

---

## Current Setup

Based on your code, here's what happens:

### With `WORKER_URL` set to deployed Worker:
```typescript
// app/api/chat/session/[sessionId]/route.ts
function getWorkerUrl(): string {
  return process.env.WORKER_URL || 
         process.env.NEXT_PUBLIC_WORKER_URL || 
         'http://localhost:8787';  // ← Falls back to local
}
```

1. Next.js API route gets request
2. Checks for local Worker (doesn't exist)
3. Proxies to `WORKER_URL` (your deployed Worker)
4. Deployed Worker uses Durable Objects ✅
5. Data stored in Cloudflare ✅

### Without `WORKER_URL` or local Worker running:
```typescript
// lib/chat-session-client.ts
async getState(): Promise<ChatSessionState | null> {
  const response = await fetch(`${this.baseUrl}`);
  if (!response.ok) {
    if (response.status === 503) {
      // Durable Objects not available, try localStorage fallback
      const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
      return JSON.parse(stored);  // ← Uses localStorage
    }
  }
}
```

1. Next.js API route gets request
2. Tries to proxy to Worker
3. Gets 503 (Worker unavailable)
4. Falls back to localStorage
5. Data stored in browser only ⚠️

---

## Recommended Setup for You

Since you've deployed the Worker, I recommend **Option 1**:

### Step 1: Update `.env.local`
```bash
WORKER_URL=https://ccsf-tutoring-ai-agent.aoo13.workers.dev
```

### Step 2: Just run Next.js
```bash
npm run dev
```

That's it! 🎉

---

## When to Use Each Option

| Scenario | Use This |
|----------|----------|
| **Normal development** | Option 1: Deployed Worker |
| **Changing Worker code** | Option 2: Local Worker |
| **Only UI changes** | Option 3: localStorage fallback |
| **Production** | Deployed Worker (already done) |

---

## Testing Your Setup

### Check which Worker you're using:

1. **Check browser console:**
   - Using Durable Objects: `✅ Using Cloudflare Durable Objects for chat state`
   - Using localStorage: `⚠️ Durable Objects Worker not running. Using localStorage fallback.`

2. **Check Network tab:**
   - Deployed Worker: Requests to `ccsf-tutoring-ai-agent.aoo13.workers.dev`
   - Local Worker: Requests to `localhost:8787`
   - localStorage: 503 errors, then localStorage

3. **Check Cloudflare Dashboard:**
   - If using deployed Worker: New instances appear in dashboard
   - If using localStorage: Nothing appears

---

## Summary

**After deployment, you have 3 options:**

1. ✅ **Use deployed Worker** (easiest) - Set `WORKER_URL` and just run `npm run dev`
2. ⚡ **Use local Worker** - Run `wrangler dev --remote` + `npm run dev` (for testing Worker changes)
3. 💾 **Use localStorage** - Just run `npm run dev` (no Worker needed)

**For most development, Option 1 is best!** 🎯

