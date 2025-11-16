# Where is Durable Object Data Stored?

## Short Answer: **Yes, in Your Cloudflare Account!**

When using Durable Objects, all chat data is stored **in your Cloudflare account** on Cloudflare's infrastructure.

## Where Data is Stored Based on Setup

### ✅ **Scenario 1: Running `wrangler dev --remote`**
```bash
wrangler dev src/index.ts --remote
```

**Data Location:** 
- ✅ **Stored in your Cloudflare account**
- ✅ **Cloudflare's infrastructure** (remote)
- ✅ **Development environment** of your account
- ✅ **Persists across restarts**
- ✅ **Accessible via Cloudflare dashboard**

### ✅ **Scenario 2: Deployed with `wrangler deploy`**
```bash
wrangler deploy
```

**Data Location:**
- ✅ **Stored in your Cloudflare account**
- ✅ **Cloudflare's production infrastructure**
- ✅ **Production environment** of your account
- ✅ **Persists forever** (until you delete it)
- ✅ **Accessible via Cloudflare dashboard**

### ❌ **Scenario 3: Only Running Next.js (`npm run dev`)**
```bash
npm run dev
# (Worker NOT running)
```

**Data Location:**
- ❌ **NOT in Cloudflare account**
- ⚠️ **Using localStorage fallback** (browser only)
- ❌ **Lost if browser data cleared**
- ❌ **Not accessible from Cloudflare dashboard**

## How to Verify Data is in Cloudflare

### 1. **Check Cloudflare Dashboard**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Navigate to **Workers & Pages**
4. Click on your Worker: **`ccsf-tutoring-ai-agent`**
5. Go to **Durable Objects** tab
6. You should see:
   - **Active Durable Objects** (instances)
   - **Storage usage**
   - **Request count**

### 2. **Check via Wrangler CLI**

```bash
# List all Durable Objects in your account
wrangler durable-objects list CHAT_SESSION

# Get storage info
wrangler tail --format pretty
```

### 3. **Check Worker Logs**

When data is saved, you'll see logs in:
```bash
# Terminal running wrangler dev
[wrangler:info] POST /api/chat/session/... 200 OK
```

## What Gets Stored in Your Cloudflare Account

For each chat session, Cloudflare stores:

```typescript
// In your Cloudflare account (Durable Object Storage)
Session ID: "session-1763264606917-w2j2kfd45"

Data:
{
  messages: [
    { role: 'user', content: 'I need help with Python' },
    { role: 'assistant', content: '...' }
  ],
  pendingMatch: { tutor: {...}, matchScore: 0.95 },
  lastSearchCriteria: { skill: 'Python', day: 'Monday' },
  availableTutorsList: [...],
  bookingInfo: {
    studentName: '...',
    studentEmail: '...',
    ...
  },
  createdAt: 1703123456789,
  lastAccessedAt: 1703123456789
}
```

## Storage Details

### **Account-Level**
- ✅ Data is tied to **your Cloudflare account**
- ✅ Billed to **your account**
- ✅ Access controlled by **your account permissions**

### **Region & Replication**
- ✅ Stored on **Cloudflare's global edge network**
- ✅ **Automatically replicated** across multiple data centers
- ✅ **Backed up** by Cloudflare (redundancy)
- ✅ **Low latency** (data stored close to users)

### **Persistence**
- ✅ Survives **Worker restarts**
- ✅ Survives **deployments**
- ✅ Survives **Cloudflare infrastructure updates**
- ✅ Persists until **explicitly deleted** or **account is closed**

## Viewing Storage in Dashboard

### **Dashboard Path:**
```
Cloudflare Dashboard
  → Workers & Pages
    → ccsf-tutoring-ai-agent (your Worker)
      → Durable Objects tab
        → CHAT_SESSION namespace
          → Active instances
          → Storage usage
```

### **What You Can See:**
- ✅ **Number of active Durable Object instances**
- ✅ **Storage size used**
- ✅ **Request count**
- ✅ **Errors/warnings**

### **What You CANNOT See:**
- ❌ **Individual session data** (privacy/security)
- ❌ **Message content** (must access via API)
- ❌ **Real-time updates** (only aggregated stats)

## Accessing Data Programmatically

To read your stored data, use the API:

```typescript
// From your Worker or API route
const id = env.CHAT_SESSION.idFromName('session-123');
const stub = env.CHAT_SESSION.get(id);
const response = await stub.fetch(new Request('http://do/state'));
const state = await response.json();
// Returns all chat data for that session
```

## Data Retention

- ✅ **Persists indefinitely** unless deleted
- ✅ **No automatic expiration** (you control it)
- ⚠️ **Billed per GB stored** (check Cloudflare pricing)
- 💡 **Consider cleanup logic** for old sessions

## Privacy & Security

- ✅ **Data is private** to your Cloudflare account
- ✅ **Encrypted at rest** (Cloudflare handles this)
- ✅ **Access controlled** by your account credentials
- ✅ **Compliant** with Cloudflare's security standards

## Summary

| Setup | Stored in Cloudflare? | Where? |
|-------|----------------------|--------|
| `wrangler dev --remote` | ✅ Yes | Your Cloudflare account (dev) |
| `wrangler deploy` | ✅ Yes | Your Cloudflare account (prod) |
| `npm run dev` only | ❌ No | localStorage (browser) |

**Bottom Line:** When the Worker is running (with `--remote` or deployed), **all chat data is stored in your Cloudflare account** and persists across restarts, deployments, and browser sessions!

