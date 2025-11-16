// Main Cloudflare Worker entry point
// Exports Durable Object and handles API routes
// Reference: https://developers.cloudflare.com/durable-objects/

import { ChatSession } from '../durable-objects/chat-session';

/**
 * Export Durable Object class
 * This allows it to be used as a binding in wrangler.toml
 * Must be exported from the main Worker file
 */
export { ChatSession };

// Alternative export format (Cloudflare may need this)
// export class ChatSession { ... }

// Also export types for use in Worker
export type { ChatSessionState, BookingInfo } from '../durable-objects/chat-session';

/**
 * Environment interface for Worker
 */
export interface Env {
  CHAT_SESSION: DurableObjectNamespace;
  DB: D1Database;
  VECTORIZE_INDEX: VectorizeIndex;
  OPENAI_API_KEY?: string;
}

/**
 * Worker entry point
 * Handles API routes that need Durable Objects
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to chat session Durable Object
    if (path.startsWith('/api/chat/session/')) {
      const sessionIdMatch = path.match(/\/api\/chat\/session\/([^/]+)(.*)/);
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        const remainingPath = sessionIdMatch[2] || '/';
        const id = env.CHAT_SESSION.idFromName(sessionId);
        const stub = env.CHAT_SESSION.get(id);
        
        // Construct the path for Durable Object (e.g., /messages, /state, /pending-match, etc.)
        // If no sub-path provided, default to /state for GET and PUT requests
        const doPath = remainingPath === '/' && (request.method === 'GET' || request.method === 'PUT') ? '/state' : remainingPath;
        const doPathWithQuery = doPath + url.search;
        
        // Forward request to Durable Object
        // Use a relative URL path for the Durable Object
        const doRequest = new Request(
          `http://durable-object${doPathWithQuery}`,
          {
            method: request.method,
            headers: request.headers,
            body: request.body ? await request.clone().text() : undefined,
          }
        );
        
        return stub.fetch(doRequest);
      }
    }

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'ccsf-tutoring-ai-agent' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

