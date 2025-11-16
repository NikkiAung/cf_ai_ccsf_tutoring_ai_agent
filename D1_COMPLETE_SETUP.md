# ✅ Cloudflare D1 Database - Complete Setup

## What's Done

✅ **D1 Database Created**: `ccsf-tutoring-db`  
✅ **Database ID**: `5e1cd1a0-bef9-4496-acd5-025a316a6c4b`  
✅ **Account ID**: `d579ae1826963504bbd94f25586ffc69`  
✅ **Schema Migrated**: All tables created  
✅ **Data Seeded**: 4 tutors inserted  
✅ **Code Updated**: Automatically uses real D1 when available  

## How It Works Now

The `getDatabase()` function automatically chooses:

1. **Cloudflare Workers** → `env.DB` (real D1) ✅
2. **Wrangler Dev** → `env.DB` (real D1) ✅
3. **Next.js with API Token** → D1 HTTP API (real D1) ✅
4. **Next.js without API Token** → Mock DB (for development) ✅

## Use Real D1 in Next.js

### Step 1: Create Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template OR create custom:
   - **Permissions**: Account → D1 → Edit
   - **Account Resources**: Include → `Aoo13@mail.ccsf.edu's Account`
4. Copy the token

### Step 2: Add to .env.local

```bash
# Add these to .env.local
CLOUDFLARE_ACCOUNT_ID=d579ae1826963504bbd94f25586ffc69
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_D1_DATABASE_ID=5e1cd1a0-bef9-4496-acd5-025a316a6c4b
```

### Step 3: Restart Next.js

```bash
npm run dev
```

Check console - you should see:
```
✅ Using Cloudflare D1 via HTTP API
```

## Verify Database

### Check Remote Database

```bash
# Count tutors
wrangler d1 execute ccsf-tutoring-db --remote --command="SELECT COUNT(*) as count FROM tutors"

# List all tutors
wrangler d1 execute ccsf-tutoring-db --remote --command="SELECT * FROM tutors"
```

### Check Local Database (for wrangler dev)

```bash
wrangler d1 execute ccsf-tutoring-db --local --command="SELECT * FROM tutors"
```

## Database Schema

Your database has:

- **tutors** (4 rows)
- **skills** (11 rows)
- **tutor_skills** (junction table)
- **availability** (12 rows)

## Current Status

| Environment | Database Used | Status |
|------------|---------------|--------|
| Cloudflare Workers | Real D1 (env.DB) | ✅ Ready |
| Wrangler Dev | Real D1 (env.DB) | ✅ Ready |
| Next.js (with API token) | Real D1 (HTTP API) | ⚙️ Set API token |
| Next.js (no API token) | Mock DB | ✅ Works (dev only) |

## Testing

### Test API Endpoint

```bash
# Should return tutors from real D1 (if API token set)
curl http://localhost:3000/api/tutors
```

### Test with Real Data

Once API token is set, your Next.js app will:
- ✅ Use real D1 database
- ✅ Return actual tutor data
- ✅ Work with RAG embeddings from real data

## Next Steps

1. **Set API Token** (optional, for Next.js to use real D1)
2. **Deploy to Workers** - D1 will work automatically
3. **Add More Tutors** - Insert into D1 database

## Resources

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [D1 HTTP API](https://developers.cloudflare.com/d1/platform/http-api/)
- [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/)

