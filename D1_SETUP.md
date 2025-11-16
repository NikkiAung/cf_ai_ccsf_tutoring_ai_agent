# Cloudflare D1 Database Setup

## ✅ Database Created and Migrated

Your Cloudflare D1 database is now set up and ready to use!

### Database Details
- **Name**: `ccsf-tutoring-db`
- **ID**: `5e1cd1a0-bef9-4496-acd5-025a316a6c4b`
- **Region**: WNAM
- **Status**: ✅ Schema created, ✅ Data seeded

## How It Works

### In Cloudflare Workers (Production)
- Uses `env.DB` binding directly
- Real D1 database with all data
- No code changes needed

### In Next.js Development

**Option 1: Use Mock Database (Current)**
- Uses `mockDb` for local development
- Fast, no setup needed
- Good for frontend development

**Option 2: Use Real D1 with Wrangler Dev**
```bash
# Run Next.js with D1 bindings
wrangler dev --remote
# Or use wrangler pages dev for Pages
```

**Option 3: Use D1 HTTP API**
- Create API routes that call D1 via HTTP
- More complex but works in pure Next.js

## Current Implementation

The code automatically detects the environment:

1. **Workers**: Uses `env.DB` (real D1) ✅
2. **Wrangler Dev**: Uses `env.DB` (real D1) ✅
3. **Next.js Dev**: Uses `mockDb` (mock data) ✅

## Verify Database

### Check Local Database
```bash
wrangler d1 execute ccsf-tutoring-db --local --command="SELECT * FROM tutors"
```

### Check Remote Database
```bash
wrangler d1 execute ccsf-tutoring-db --remote --command="SELECT * FROM tutors"
```

### List All Databases
```bash
wrangler d1 list
```

## Using Real D1 in Next.js

### Method 1: Wrangler Dev (Recommended)

Create a script to run Next.js with D1:

```bash
# In package.json
"dev:d1": "wrangler pages dev .next --d1=DB=ccsf-tutoring-db"
```

### Method 2: API Routes

Your API routes (`/api/tutors`, `/api/match`, etc.) will automatically use:
- **Real D1** when deployed to Cloudflare Workers/Pages
- **Mock DB** when running `npm run dev` locally

### Method 3: Update getDatabase()

The `getDatabase()` function in `lib/mockDb.ts` now:
1. Checks for `env.DB` (Workers/Wrangler)
2. Falls back to `mockDb` (Next.js dev)

## Database Schema

Your database has these tables:
- `tutors` - Tutor information
- `skills` - Available skills
- `tutor_skills` - Tutor-skill relationships
- `availability` - Tutor availability slots

## Seed Data

4 tutors have been inserted:
1. Aung Nanda O
2. Mei O
3. Chris H
4. Claire C

## Next Steps

1. **For Production**: Deploy to Cloudflare Workers/Pages - D1 will work automatically
2. **For Local Dev**: Continue using mock DB, or use `wrangler dev --remote`
3. **To Add More Tutors**: Insert into D1 database directly or via API

## Resources

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [D1 API Reference](https://developers.cloudflare.com/d1/worker-api/)
- [D1 Best Practices](https://developers.cloudflare.com/d1/best-practices/)

