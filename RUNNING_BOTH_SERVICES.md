# Running Both Next.js and Worker Together

This guide explains how to run both the Next.js frontend and Cloudflare Worker simultaneously, so the Next.js app can use Durable Objects for persistent chat state.

## Overview

When you run both services:
- **Next.js** (`npm run dev`) runs at `http://localhost:3000`
- **Worker** (`wrangler dev --remote`) runs at `http://localhost:8787`
- Next.js API routes proxy to the Worker when Durable Objects aren't available locally

## Setup

### Step 1: Configure Worker URL

Add the Worker URL to your `.env.local`:

```bash
# .env.local
WORKER_URL=http://localhost:8787
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

### Step 2: Start Both Services

**Terminal 1 - Start Worker:**
```bash
wrangler dev src/index.ts --remote
```

**Terminal 2 - Start Next.js:**
```bash
npm run dev
```

## How It Works

### Next.js API Routes

The API routes (`app/api/chat/session/[sessionId]/`) automatically:
1. **First try** to use Durable Objects directly (if in Workers environment)
2. **Fall back** to proxying requests to the Worker at `http://localhost:8787`
3. **If Worker unavailable**, return 503 and use localStorage fallback (in `ChatSessionClient`)

### Request Flow

```
Browser (localhost:3000)
  ↓
Next.js Frontend (ChatInterface.tsx)
  ↓
Next.js API Route (/api/chat/session/[sessionId]/messages)
  ↓
[Check if Durable Objects available locally]
  ↓ NO → Proxy to Worker (http://localhost:8787)
  ↓ YES → Use Durable Object directly
  ↓
Cloudflare Worker (src/index.ts)
  ↓
Durable Object (ChatSession)
  ↓
Persistent Storage ✅
```

## Testing

### Test Worker Directly

```bash
# Health check
curl http://localhost:8787/health

# Get messages
curl http://localhost:8787/api/chat/session/test-session/messages

# Add message
curl -X POST http://localhost:8787/api/chat/session/test-session/messages \
  -H "Content-Type: application/json" \
  -d '{"role":"user","content":"Hello"}'
```

### Test Through Next.js

1. Open `http://localhost:3000/schedule`
2. Chat with the assistant
3. Refresh the page
4. **State should persist** (using Durable Objects via Worker)

## Troubleshooting

### Worker Not Running

If the Worker isn't running, Next.js will:
- Try to proxy → fail
- Fall back to localStorage (in `ChatSessionClient`)
- State persists in browser only (lost if cleared)

**Solution:** Make sure `wrangler dev --remote` is running.

### Connection Errors

If you see "Worker Unavailable" errors:
1. Check Worker is running: `curl http://localhost:8787/health`
2. Verify `WORKER_URL` in `.env.local`
3. Check firewall/port blocking

### Port Conflicts

If port 8787 is in use:
```bash
# Find process using port 8787
lsof -ti:8787

# Kill it
kill $(lsof -ti:8787)
```

Or use a different port in `wrangler.toml`:
```toml
[dev]
port = 8788
```

And update `.env.local`:
```bash
WORKER_URL=http://localhost:8788
```

## Benefits of Running Both

✅ **Persistent State**: Chat history persists across page refreshes  
✅ **Development**: Test full stack locally  
✅ **Hot Reload**: Both services reload on file changes  
✅ **Debugging**: See logs from both services  

## Production

In production:
- Next.js deployed to Cloudflare Pages or Vercel
- Worker deployed to Cloudflare Workers
- No need to proxy - both run on Cloudflare infrastructure
- Durable Objects work natively

## Quick Reference

```bash
# Terminal 1: Start Worker
wrangler dev src/index.ts --remote

# Terminal 2: Start Next.js  
npm run dev

# Test Worker
curl http://localhost:8787/health

# Test Next.js
open http://localhost:3000/schedule
```

