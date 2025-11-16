// D1 HTTP API Client for Next.js
// Allows Next.js to access Cloudflare D1 via HTTP API
// Reference: https://developers.cloudflare.com/d1/platform/http-api/

import type { Database } from './db';

interface D1HTTPResponse<T = unknown> {
  success: boolean;
  result: Array<{
    results: T[];
    success: boolean;
    meta: {
      duration: number;
      rows_read: number;
      rows_written: number;
    };
  }>;
  errors?: Array<{ code: number; message: string }>;
}

/**
 * D1 HTTP API Client
 * Uses Cloudflare D1 HTTP API to execute queries
 */
class D1HTTPClient implements Database {
  private accountId: string;
  private databaseId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, databaseId: string, apiToken: string) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  async executeQuery<T = unknown>(query: string, params: unknown[] = []): Promise<{ results: T[] }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: query,
        params: params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`D1 API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as D1HTTPResponse<T>;
    
    // Log the full response for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('D1 API Response:', JSON.stringify(data, null, 2));
    }
    
    // Check for errors - data.errors might be an empty array, so check length
    if (!data.success || (data.errors && data.errors.length > 0)) {
      const errorMsg = data.errors?.[0]?.message || JSON.stringify(data.errors) || 'Unknown error';
      throw new Error(`D1 query failed: ${errorMsg}`);
    }

    // D1 API returns results in data.result[0] format
    // Each result has a 'results' array
    if (data.result && data.result.length > 0 && data.result[0]) {
      return data.result[0] as { results: T[] };
    }
    
    return { results: [] };
  }

  prepare(query: string) {
    return {
      bind: (...values: unknown[]) => {
        return {
          first: async <T = unknown>(): Promise<T | null> => {
            const result = await this.executeQuery<T>(query, values);
            return result.results[0] || null;
          },
          all: async <T = unknown>(): Promise<{ results: T[] }> => {
            return this.executeQuery<T>(query, values);
          },
          run: async (): Promise<{ success: boolean; meta: { changes: number } }> => {
            const result = await this.executeQuery(query, values);
            return {
              success: true,
              meta: {
                changes: result.results.length,
              },
            };
          },
        };
      },
    };
  }
}

/**
 * Create D1 HTTP client from environment variables
 * Requires:
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_API_TOKEN (with D1 read/write permissions)
 * - CLOUDFLARE_D1_DATABASE_ID (or uses the one from wrangler.toml)
 */
export function createD1HTTPClient(): Database | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || '5e1cd1a0-bef9-4496-acd5-025a316a6c4b';

  if (!accountId || !apiToken) {
    return null;
  }

  return new D1HTTPClient(accountId, databaseId, apiToken);
}

