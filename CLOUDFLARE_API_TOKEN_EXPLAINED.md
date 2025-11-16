# What is CLOUDFLARE_API_TOKEN Used For?

## Purpose

The `CLOUDFLARE_API_TOKEN` is used to **authenticate with Cloudflare's HTTP API** so that your Next.js app can access your D1 database directly.

## Why Do We Need It?

### The Problem

- **Cloudflare Workers** can access D1 via `env.DB` binding (built-in)
- **Next.js** cannot access Workers bindings directly
- **Solution**: Use Cloudflare's HTTP API to query D1 from Next.js

### How It Works

```
Next.js App
    ↓
HTTP Request to Cloudflare API
    ↓
CLOUDFLARE_API_TOKEN (authentication)
    ↓
Cloudflare D1 Database
    ↓
Returns data
```

## Where It's Used

In `lib/d1-http-client.ts`, the token is used to authenticate API requests:

```typescript
const response = await fetch('https://api.cloudflare.com/client/v4/accounts/.../d1/database/.../query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,  // ← Used here
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql: query, params: [...] }),
});
```

## When Is It Needed?

### ✅ Required For:
- **Next.js local development** - To use real D1 instead of mock DB
- **Next.js production** - If deployed outside Cloudflare (e.g., Vercel)

### ❌ NOT Required For:
- **Cloudflare Workers** - Uses `env.DB` binding (no token needed)
- **Wrangler Dev** - Uses `env.DB` binding (no token needed)
- **Next.js with mock DB** - Uses local mock data (no token needed)

## How to Get It

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template OR create custom:
   - **Permissions**: Account → D1 → Edit
   - **Account Resources**: Include your account
4. Copy the token

## Security

⚠️ **Important**: 
- Never commit the token to git
- Store it in `.env.local` (already in `.gitignore`)
- The token has full D1 access - keep it secret!

## Alternative: Without API Token

If you don't set the API token:
- ✅ Next.js will use **mock database** (for development)
- ✅ Workers will still use **real D1** (via `env.DB`)
- ✅ Everything works, just using mock data locally

## Summary

| Scenario | Database Used | Token Needed? |
|----------|---------------|---------------|
| Next.js (with token) | Real D1 (HTTP API) | ✅ Yes |
| Next.js (no token) | Mock DB | ❌ No |
| Cloudflare Workers | Real D1 (env.DB) | ❌ No |
| Wrangler Dev | Real D1 (env.DB) | ❌ No |

**TL;DR**: The API token lets Next.js access your D1 database via HTTP API. Without it, Next.js uses mock data (which is fine for local dev).

