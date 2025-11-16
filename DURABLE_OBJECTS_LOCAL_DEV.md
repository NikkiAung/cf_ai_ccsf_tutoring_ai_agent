# Durable Objects - Local Development Guide

## Important: Durable Objects and Next.js

**Durable Objects ONLY work in Cloudflare Workers environment**, not in pure Next.js local development.

### Current Situation

When you run `npm run dev` (Next.js):
- ❌ **Durable Objects are NOT available**
- ❌ Chat state will NOT persist (falls back to React state only)
- ⚠️ API routes return 503 for Durable Object endpoints
- ✅ Chat still works, but state is lost on refresh

### Why?

- **Next.js** (`npm run dev`) = Runs locally, no Cloudflare bindings
- **Cloudflare Workers** = Runs on Cloudflare, has Durable Object bindings

## Options for Local Development

### Option 1: Use Wrangler Dev (Recommended for Testing Durable Objects)

To test Durable Objects locally, you need to use `wrangler dev` instead of `npm run dev`:

```bash
# Run Worker with Durable Objects support
wrangler dev src/index.ts --remote

# Or if you want to test the full Next.js app with Workers:
# This requires deploying Next.js to Cloudflare Pages or using a bridge
```

**Note:** `--remote` flag is required because Durable Objects only work on Cloudflare's infrastructure.

### Option 2: Keep Using Next.js (Current Behavior)

Continue using `npm run dev`:
- ✅ Fast development
- ✅ Hot reload
- ⚠️ Chat state won't persist (React state only)
- ✅ Works fine for UI development

**When to use:** When you're just developing the UI/frontend.

### Option 3: Add Fallback Storage (Alternative)

Add localStorage or IndexedDB fallback for Next.js dev:

```typescript
// lib/chat-session-client.ts - Add fallback
async getState(): Promise<ChatSessionState | null> {
  try {
    const response = await fetch(`${this.baseUrl}`);
    if (response.ok) {
      return await response.json();
    }
    
    // Fallback to localStorage for Next.js dev
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    
    return null;
  } catch (error) {
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return null;
  }
}
```

## Deployment Workflow

### For Production (With Durable Objects)

```bash
# Step 1: Deploy Worker with Durable Object
wrangler deploy

# Step 2: Deploy Next.js app (or use Cloudflare Pages)
# Durable Objects will work through API routes
```

### For Local Development (Without Durable Objects)

```bash
# Just run Next.js normally
npm run dev

# Chat works, but state won't persist
# Use this for UI/UX development
```

## Testing Durable Objects Locally

If you want to test Durable Objects functionality:

### Method 1: Test Worker Directly

```bash
# Start Worker with Durable Objects
wrangler dev src/index.ts --remote

# Test in another terminal
curl http://localhost:8787/api/chat/session/test-session/messages
```

### Method 2: Deploy and Test

```bash
# Deploy Worker
wrangler deploy

# Test deployed Worker
curl https://your-worker.workers.dev/api/chat/session/test-session/messages

# Then point your Next.js app to use the deployed Worker
```

## Recommendation

**For now, continue using `npm run dev` for local development:**
- ✅ Fast development cycle
- ✅ UI/UX testing works fine
- ⚠️ State won't persist (but that's okay for development)

**Deploy to Cloudflare Workers when:**
- ✅ You're ready to test state persistence
- ✅ You want to test production behavior
- ✅ You're ready for final testing

## Current Behavior

**When running `npm run dev`:**
1. Chat works normally ✅
2. Messages displayed ✅
3. Matching works ✅
4. Booking flow works ✅
5. **State lost on refresh** ⚠️ (expected in Next.js dev)

**When deployed to Workers:**
1. Everything above works ✅
2. **State persists across refreshes** ✅
3. Durable Objects functional ✅

## Quick Answer

**Do you need to run `wrangler deploy` before `npm run dev`?**

**No!** You can continue using `npm run dev` normally:
- Chat will work
- State just won't persist (that's expected in Next.js dev)
- Durable Objects will work when you deploy to Workers

**Only deploy when you want to test state persistence!**

