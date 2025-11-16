// D1 Database client for Next.js and Workers
// Supports both Cloudflare Workers (env.DB) and Next.js (via wrangler dev or HTTP API)

import type { Database } from './db';

// For Workers: D1Database from @cloudflare/workers-types
// For Next.js: We'll use a wrapper that can work with local D1 or HTTP API

/**
 * Get D1 database instance
 * In Workers: Uses env.DB binding
 * In Next.js: Uses local D1 via wrangler or falls back to mock
 */
export function getD1Database(): Database | null {
  // Check if we're in a Cloudflare Workers environment
  // Workers have globalThis.env or process.env with DB binding
  if (typeof globalThis !== 'undefined' && 'env' in globalThis) {
    const env = (globalThis as any).env;
    if (env && env.DB) {
      return env.DB as Database;
    }
  }

  // Check if we're in Node.js with process.env (for wrangler dev)
  if (typeof process !== 'undefined' && process.env) {
    // When running with wrangler dev, D1 is available via bindings
    // This will be handled by wrangler's runtime
    return null;
  }

  return null;
}

/**
 * Check if we're running in a Cloudflare Workers environment
 */
export function isWorkersEnvironment(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'env' in globalThis &&
    (globalThis as any).env?.DB !== undefined
  );
}

/**
 * Check if we're running with wrangler dev (local D1)
 */
export function isWranglerDev(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env &&
    (process.env.WRANGLER_SESSION_MANIFEST !== undefined ||
      process.env.CF_PAGES !== undefined)
  );
}

