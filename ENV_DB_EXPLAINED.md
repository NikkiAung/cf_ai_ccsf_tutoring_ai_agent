# Where is env.DB Value Stored?

## Short Answer

**`env.DB` is NOT stored as a value** - it's a **runtime binding** that Cloudflare Workers automatically injects when your Worker runs.

## How It Works

### 1. Configuration (wrangler.toml)

You configure the binding in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"                    # ← This becomes env.DB
database_name = "ccsf-tutoring-db"
database_id = "5e1cd1a0-bef9-4496-acd5-025a316a6c4b"
```

### 2. Runtime Injection

When your Worker runs, Cloudflare automatically:
1. Reads `wrangler.toml`
2. Finds the D1 database with `binding = "DB"`
3. Connects to the database
4. Injects it into `env.DB`

### 3. Usage in Code

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // env.DB is automatically available here!
    // Cloudflare injected it based on wrangler.toml
    const tutors = await env.DB.prepare('SELECT * FROM tutors').all();
    return new Response(JSON.stringify(tutors));
  },
};
```

## Where It's "Stored"

### Not Stored As:
- ❌ Environment variable
- ❌ Config file value
- ❌ Hardcoded in code

### Actually:
- ✅ **Binding configuration** in `wrangler.toml`
- ✅ **Runtime injection** by Cloudflare Workers
- ✅ **Database connection** created on-demand

## The Flow

```
1. wrangler.toml
   [[d1_databases]]
   binding = "DB"  ← Configuration
   
2. Cloudflare Workers Runtime
   Reads config → Connects to D1 → Injects into env.DB
   
3. Your Worker Code
   env.DB.prepare(...)  ← Automatically available!
```

## TypeScript Types

To use `env.DB` in TypeScript, define the `Env` interface:

```typescript
export interface Env {
  DB: D1Database;  // ← Type definition
  VECTORIZE_INDEX: VectorizeIndex;
  OPENAI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // env.DB is typed as D1Database
    const result = await env.DB.prepare('SELECT * FROM tutors').all();
  },
};
```

## Local Development

### With Wrangler Dev

```bash
wrangler dev
```

Wrangler:
1. Reads `wrangler.toml`
2. Connects to local D1 database (`.wrangler/state/v3/d1/`)
3. Injects into `env.DB`

### Local D1 Database

When you run `wrangler d1 execute --local`, it creates a local SQLite file:
- Location: `.wrangler/state/v3/d1/`
- Format: SQLite database file
- Separate from remote D1

## Production

### Deployed Worker

When deployed:
1. Cloudflare reads `wrangler.toml` from your deployment
2. Connects to your remote D1 database
3. Injects `env.DB` at runtime
4. Database ID: `5e1cd1a0-bef9-4496-acd5-025a316a6c4b`

## Multiple Bindings

You can have multiple D1 databases:

```toml
[[d1_databases]]
binding = "DB"           # → env.DB
database_name = "ccsf-tutoring-db"

[[d1_databases]]
binding = "ANALYTICS_DB" # → env.ANALYTICS_DB
database_name = "analytics-db"
```

## Security

- ✅ **No credentials needed** - Cloudflare handles authentication
- ✅ **Automatic connection** - Managed by Cloudflare
- ✅ **Isolated per Worker** - Each Worker has its own bindings

## Summary

| Question | Answer |
|----------|--------|
| **Where is it stored?** | Not stored - it's a runtime binding |
| **Where is it configured?** | `wrangler.toml` |
| **When is it available?** | At runtime when Worker executes |
| **How does it work?** | Cloudflare injects it based on config |
| **Do I need credentials?** | No - Cloudflare handles it |

**TL;DR**: `env.DB` is not a stored value. It's a **binding** that Cloudflare Workers automatically provides based on your `wrangler.toml` configuration. When your Worker runs, Cloudflare connects to your D1 database and makes it available as `env.DB`.

