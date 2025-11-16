# Using Cloudflare D1 in Next.js

## Current Setup

Your code now automatically detects and uses the appropriate database:

1. **Cloudflare Workers** → Uses `env.DB` (real D1) ✅
2. **Wrangler Dev** → Uses `env.DB` (real D1) ✅  
3. **Next.js with API Token** → Uses D1 HTTP API (real D1) ✅
4. **Next.js without API Token** → Uses mock DB (for development) ✅

## Option 1: Use Real D1 in Next.js (Recommended)

### Step 1: Get Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Create a token with:
   - **Permissions**: Account → D1 → Edit
   - **Account Resources**: Include your account
3. Copy the token

### Step 2: Get Your Account ID

```bash
wrangler whoami
# Or check Cloudflare Dashboard → Right sidebar → Account ID
```

### Step 3: Add to .env.local

```bash
# Add to .env.local
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_D1_DATABASE_ID=5e1cd1a0-bef9-4496-acd5-025a316a6c4b
```

### Step 4: Restart Next.js

```bash
npm run dev
```

Now your Next.js app will use **real Cloudflare D1**! ✅

## Option 2: Use Wrangler Dev (Alternative)

Run Next.js with D1 bindings:

```bash
# Install @cloudflare/next-on-pages if needed
npm install @cloudflare/next-on-pages

# Run with D1 bindings
wrangler pages dev .next --d1=DB=ccsf-tutoring-db
```

## Option 3: Keep Using Mock (Current)

If you don't set the environment variables, it will continue using the mock database for local development.

## Verify It's Working

Check the console when you start Next.js:
- ✅ `Using Cloudflare D1 via Workers binding` = Real D1 (Workers/Wrangler)
- ✅ `Using Cloudflare D1 via HTTP API` = Real D1 (Next.js with API token)
- ⚠️ `Using mock database` = Mock DB (Next.js without API token)

## Database Status

Your D1 database is ready:
- ✅ **Created**: `ccsf-tutoring-db`
- ✅ **Schema**: Migrated
- ✅ **Data**: 4 tutors seeded
- ✅ **Remote**: Available in production
- ✅ **Local**: Available via wrangler dev

## Testing

### Test API Endpoint

```bash
# Should return tutors from real D1 (if API token set) or mock DB
curl http://localhost:3000/api/tutors
```

### Query D1 Directly

```bash
# Remote database
wrangler d1 execute ccsf-tutoring-db --remote --command="SELECT * FROM tutors"

# Local database (for wrangler dev)
wrangler d1 execute ccsf-tutoring-db --local --command="SELECT * FROM tutors"
```

## Summary

- **Production (Workers)**: Automatically uses real D1 ✅
- **Local with API Token**: Uses real D1 via HTTP API ✅
- **Local without API Token**: Uses mock DB (for development) ✅

The code automatically chooses the right database based on what's available!

