# How to Get Cloudflare API Token for D1

## Quick Method: Use "Edit Cloudflare Workers" Template

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Edit Cloudflare Workers"** template
3. Click **"Use template"**
4. Review permissions (should include D1 access)
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **Copy the token immediately** (you won't see it again!)

## Custom Token Method (More Secure)

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"** → **"Custom token"**
3. Configure:
   - **Token name**: `D1 Database Access` (or any name you like)
   - **Permissions**:
     - Account → D1 → Edit
   - **Account Resources**:
     - Include → All accounts (or select your specific account)
4. Click **"Continue to summary"**
5. Review and click **"Create Token"**
6. **Copy the token immediately!**

## Add to .env.local

After getting your token, update `.env.local`:

```bash
CLOUDFLARE_ACCOUNT_ID=d579ae1826963504bbd94f25586ffc69
CLOUDFLARE_API_TOKEN=your-actual-token-here  # ← Paste your token here
CLOUDFLARE_D1_DATABASE_ID=5e1cd1a0-bef9-4496-acd5-025a316a6c4b
```

## Restart Next.js

After updating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

You should see in the console:
- ✅ `Using Cloudflare D1 via HTTP API` (if token is valid)
- ⚠️ `Using mock database` (if token is invalid/missing)

## Verify It's Working

Check the console when Next.js starts - it will tell you which database it's using!

