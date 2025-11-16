# Deployment Guide for CCSF Tutoring AI Agent

This guide explains how to deploy the application to Cloudflare Workers and set up the D1 database.

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. OpenAI API key (for AI matching feature)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Cloudflare D1 Database

```bash
# Create a new D1 database
wrangler d1 create ccsf-tutoring-db

# Note the database_id from the output and update wrangler.toml
```

Update `wrangler.toml` with your database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ccsf-tutoring-db"
database_id = "your-database-id-here"  # Replace with actual ID
```

### 3. Run Database Migrations

```bash
# Run migrations on local database (for testing)
wrangler d1 execute ccsf-tutoring-db --local --file=./migrations/0001_initial_schema.sql
wrangler d1 execute ccsf-tutoring-db --local --file=./migrations/0002_seed_data.sql

# Run migrations on remote database (production)
wrangler d1 execute ccsf-tutoring-db --remote --file=./migrations/0001_initial_schema.sql
wrangler d1 execute ccsf-tutoring-db --remote --file=./migrations/0002_seed_data.sql
```

### 4. Set Environment Variables

```bash
# Set OpenAI API key as a secret
wrangler secret put OPENAI_API_KEY
# Enter your API key when prompted
```

### 5. Deploy to Cloudflare Workers

```bash
# Deploy the Workers backend
wrangler deploy
```

### 6. Deploy Next.js Frontend

The frontend can be deployed to:
- **Vercel** (recommended for Next.js)
- **Cloudflare Pages** (for full Cloudflare integration)

#### Deploy to Vercel:

```bash
npm install -g vercel
vercel
```

#### Deploy to Cloudflare Pages:

```bash
# Build the Next.js app
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .next
```

## Local Development

### Run Next.js Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Run Cloudflare Workers Locally

```bash
# Start local D1 database
wrangler d1 execute ccsf-tutoring-db --local --file=./migrations/0001_initial_schema.sql
wrangler d1 execute ccsf-tutoring-db --local --file=./migrations/0002_seed_data.sql

# Run Workers locally
wrangler dev
```

## Environment Variables

Create a `.env.local` file for local development:

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_API_URL=/api
```

## API Endpoints

Once deployed, the following endpoints will be available:

- `GET /api/tutors` - List all tutors
- `GET /api/tutors/:id` - Get a specific tutor
- `GET /api/availability` - Get all availability
- `POST /api/match` - Match a tutor using AI
- `POST /api/book` - Prepare booking information

## Testing

Test the API endpoints:

```bash
# Get all tutors
curl http://localhost:3000/api/tutors

# Match a tutor
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{"skill": "Python", "day": "Monday"}'
```

## Troubleshooting

### Database Connection Issues

- Ensure D1 database is created and bound correctly in `wrangler.toml`
- Verify migrations have been run
- Check database binding name matches in code (`DB`)

### OpenAI API Issues

- Verify API key is set correctly
- Check API key has sufficient credits
- Review API rate limits

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check TypeScript compilation: `npm run build`
- Verify environment variables are set





```
when I ask I need Python help on Monday at 10:00 automatically book to me asking my studentID, email

to fill out the below information before starting to open calendy page 

Let me explain u the manual workflow 

Enter Details

Name
*
Email
*

Add Guests

What is your @mail.ccsf.edu email address? (Please include this, even if it is the same as the email address you wrote above.)
*
What is your CCSF student ID number?

Are you okay with other students joining during your session?
*

Yes, I am okay with other students joining.

No, I prefer a private tutoring session.

What classes are you seeking help for? Please check all that apply!

110A

110B

110C

111B

111C

131B

150A

155P

160A

160B

195

199

211D

211S

231

256

260A

270

MATH 108

MATH 115

Other
What specifically do you need help with? (A programming assignment? Nested loops? Outer joins?) [Please don't copy/paste code here.]
Anything else the tutor should know?
By proceeding, you confirm that you have read and agree to Calendly's Terms of Use and Privacy Notice.