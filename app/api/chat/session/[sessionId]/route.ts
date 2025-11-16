// API route for chat session management using Durable Objects
// Provides persistent chat state across page refreshes
// Reference: https://developers.cloudflare.com/durable-objects/

import { NextResponse } from 'next/server';
import type { ApiError } from '@/types';

/**
 * Get Worker URL for proxying requests
 */
function getWorkerUrl(): string {
  const url = process.env.WORKER_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';
  // Log in development to debug
  if (process.env.NODE_ENV === 'development' && !process.env.WORKER_URL && !process.env.NEXT_PUBLIC_WORKER_URL) {
    console.warn('⚠️  WORKER_URL not set! Defaulting to localhost:8787. Set WORKER_URL in .env.local to use deployed Worker.');
  }
  return url;
}

/**
 * Get chat session Durable Object
 * Note: Durable Objects only available in Cloudflare Workers environment
 */
function getChatSession(sessionId: string): any | null {
  // Check if we're in a Workers environment with Durable Objects
  if (typeof globalThis !== 'undefined' && 'env' in globalThis) {
    const env = (globalThis as any).env;
    if (env?.CHAT_SESSION && typeof env.CHAT_SESSION.idFromName === 'function') {
      const id = env.CHAT_SESSION.idFromName(sessionId);
      return env.CHAT_SESSION.get(id);
    }
  }
  return null;
}

/**
 * Proxy request to Worker
 */
async function proxyToWorker(request: Request, sessionId: string, bodyText?: string): Promise<Response> {
  const workerUrl = getWorkerUrl();
  const url = new URL(request.url);
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Durable Objects] Proxying to Worker: ${workerUrl}`);
  }
  
  // Extract the sub-path after session ID (e.g., /messages, /state, etc.)
  const pathMatch = url.pathname.match(/\/api\/chat\/session\/[^/]+(.*)/);
  const subPath = pathMatch ? pathMatch[1] : '';
  
  // Default to /state for GET and PUT requests if no sub-path
  const targetPath = subPath === '' && (request.method === 'GET' || request.method === 'PUT') ? '/state' : subPath;
  const workerRequestUrl = `${workerUrl}/api/chat/session/${sessionId}${targetPath}${url.search}`;
  
  try {
    // Use provided bodyText, or read from request if not provided
    let finalBodyText: string | undefined = bodyText;
    const requestContentType = request.headers.get('Content-Type') || '';
    
    if (!finalBodyText && request.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      try {
        // Clone request before reading body to avoid "body already consumed" errors
        const clonedRequest = request.clone();
        finalBodyText = await clonedRequest.text();
      } catch (error) {
        console.warn('Could not read request body:', error);
      }
    }
    
    // Build headers, excluding host and accept-encoding
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'accept-encoding') {
        headers[key] = value;
      }
    });
    
    if (!headers['Content-Type'] && finalBodyText) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Don't accept compressed responses to avoid parsing issues
    headers['Accept-Encoding'] = 'identity';

    const workerRequest = new Request(workerRequestUrl, {
      method: request.method,
      headers,
      body: finalBodyText,
    });

    const response = await fetch(workerRequest);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Worker returned ${response.status}:`, errorText);
      
      // If it's a JSON error, try to parse it
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json<ApiError>(errorData, { status: response.status });
      } catch {
        return NextResponse.json<ApiError>(
          {
            error: 'Worker Error',
            message: errorText || `Worker returned ${response.status}`,
            statusCode: response.status,
          },
          { status: response.status }
        );
      }
    }
    
    // Get response as text first to check what we're dealing with
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: response.status });
    } catch (parseError) {
      // Not JSON - log what we got and return as text
      console.warn('Worker response is not JSON. First 200 chars:', responseText.substring(0, 200));
      console.warn('Content-Type:', response.headers.get('Content-Type'));
      console.warn('Content-Encoding:', response.headers.get('Content-Encoding'));
      return NextResponse.json(
        { error: 'Invalid JSON response', raw: responseText.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error proxying to Worker:', error);
    console.error('Worker URL attempted:', workerRequestUrl);
    
    // Check if it's a connection error
    if (error instanceof TypeError && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
      return NextResponse.json<ApiError>(
        {
          error: 'Worker Unavailable',
          message: `Could not connect to Worker at ${workerRequestUrl}. Make sure "wrangler dev src/index.ts --remote" is running in another terminal.`,
          statusCode: 503,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json<ApiError>(
      {
        error: 'Worker Unavailable',
        message: error instanceof Error ? error.message : 'Failed to connect to Worker',
        statusCode: 503,
      },
      { status: 503 }
    );
  }
}

/**
 * GET /api/chat/session/[sessionId]
 * Get chat session state
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Try to use Durable Object if in Workers environment
    const stub = getChatSession(sessionId);
    
    if (stub) {
      // Direct Durable Object access (in Workers environment)
      const response = await stub.fetch(new Request(`${request.url}/state`));
      const state = await response.json();
      return NextResponse.json(state);
    } else {
      // Proxy to Worker (in Next.js environment)
      return proxyToWorker(request, sessionId);
    }
  } catch (error) {
    console.error('Error getting chat session:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get chat session',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/chat/session/[sessionId]
 * Update chat session state
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Read body once and pass to proxyToWorker
    let bodyText: string | undefined;
    try {
      const body = await request.json();
      bodyText = JSON.stringify(body);
    } catch (error) {
      console.error('Error parsing request body:', error);
    }

    const stub = getChatSession(sessionId);
    
    if (stub) {
      // Direct Durable Object access (in Workers environment)
      const response = await stub.fetch(
        new Request(`${request.url}/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: bodyText,
        })
      );
      const result = await response.json();
      return NextResponse.json(result);
    } else {
      // Proxy to Worker (in Next.js environment) - pass bodyText to avoid re-reading
      return proxyToWorker(request, sessionId, bodyText);
    }
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update chat session',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

