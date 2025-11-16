# How Cloudflare Durable Objects Store Chat Data

## Overview

Cloudflare Durable Objects are **stateful serverless applications** that provide:
- **Persistent storage** that survives restarts
- **Single-instance guarantee** - one instance per unique ID
- **Low-latency access** - data stored in memory with automatic persistence
- **Coordination** - guaranteed ordering of operations

## Architecture Flow

```
┌─────────────────┐
│  Next.js App    │
│  (Frontend)     │
│                 │
│  ChatInterface  │
└────────┬────────┘
         │
         │ 1. User sends message
         │    POST /api/chat/session/{id}/messages
         ▼
┌─────────────────────────────────────────┐
│  Next.js API Route                      │
│  app/api/chat/session/[id]/messages.ts  │
│                                         │
│  • Checks if Worker is running          │
│  • Proxies to Worker if needed          │
└────────┬────────────────────────────────┘
         │
         │ 2. HTTP request to Worker
         │    http://localhost:8787/api/chat/session/{id}/messages
         ▼
┌─────────────────────────────────────────┐
│  Cloudflare Worker                      │
│  src/index.ts                           │
│                                         │
│  • Receives request                     │
│  • Extracts sessionId                   │
│  • Gets Durable Object stub:            │
│    env.CHAT_SESSION.idFromName(id)      │
│    env.CHAT_SESSION.get(id)             │
│  • Forwards request to Durable Object   │
└────────┬────────────────────────────────┘
         │
         │ 3. Route to specific Durable Object instance
         │    /messages, /state, /pending-match, etc.
         ▼
┌─────────────────────────────────────────┐
│  Durable Object Instance                │
│  durable-objects/chat-session.ts        │
│  ChatSession class                      │
│                                         │
│  • ONE instance per sessionId           │
│  • State in memory (fast)               │
│  • Auto-persisted to storage            │
│  • Handles HTTP requests                │
└────────┬────────────────────────────────┘
         │
         │ 4. Save to durable storage
         │    this.state.storage.put('chatState', data)
         ▼
┌─────────────────────────────────────────┐
│  Cloudflare Durable Object Storage      │
│  (Persistent, replicated, backed up)    │
│                                         │
│  Key: "chatState"                       │
│  Value: ChatSessionState {              │
│    messages: Message[],                 │
│    pendingMatch: MatchTutorResponse,    │
│    bookingInfo: BookingInfo,            │
│    ...                                  │
│  }                                      │
└─────────────────────────────────────────┘
```

## Key Components

### 1. Durable Object Class (`durable-objects/chat-session.ts`)

```typescript
export class ChatSession {
  state: DurableObjectState;  // Access to persistent storage
  env: Env;                   // Environment bindings (DB, Vectorize, etc.)
  private chatState: ChatSessionState | null = null;  // In-memory cache

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;  // Provided by Cloudflare
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    // Handle HTTP requests to this Durable Object instance
    // Routes: /messages, /state, /pending-match, etc.
  }

  // Load state from storage
  private async loadState(): Promise<void> {
    const stored = await this.state.storage.get<ChatSessionState>('chatState');
    this.chatState = stored || await this.initializeState();
  }

  // Save state to storage
  private async saveState(): Promise<void> {
    if (this.chatState) {
      await this.state.storage.put('chatState', this.chatState);
    }
  }
}
```

**Key Points:**
- Each `ChatSession` instance is unique per `sessionId`
- State is kept in memory for fast access (`this.chatState`)
- Automatically persisted to durable storage when changed
- Storage is persistent, replicated, and backed up by Cloudflare

### 2. Worker Entry Point (`src/index.ts`)

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Route requests to Durable Objects
    if (path.startsWith('/api/chat/session/')) {
      const sessionId = extractSessionId(path);
      
      // Get or create Durable Object instance for this sessionId
      const id = env.CHAT_SESSION.idFromName(sessionId);
      const stub = env.CHAT_SESSION.get(id);
      
      // Forward request to Durable Object
      return stub.fetch(doRequest);
    }
  }
}
```

**Key Points:**
- Worker acts as a router to Durable Objects
- `idFromName()` creates a deterministic ID from sessionId
- `get()` returns a stub to communicate with the Durable Object
- Same sessionId → Same Durable Object instance (guaranteed)

### 3. Configuration (`wrangler.toml`)

```toml
# Durable Objects binding
[[durable_objects.bindings]]
name = "CHAT_SESSION"
class_name = "ChatSession"

# Migration (defines the ChatSession class)
[[migrations]]
tag = "chat-session-v1"
new_classes = ["ChatSession"]
```

**Key Points:**
- Binds `CHAT_SESSION` namespace to `ChatSession` class
- Migration declares the Durable Object class
- Worker exports `ChatSession` from `src/index.ts`

### 4. Client Library (`lib/chat-session-client.ts`)

```typescript
export class ChatSessionClient {
  private sessionId: string;
  private baseUrl: string;

  async getState(): Promise<ChatSessionState | null> {
    const response = await fetch(`${this.baseUrl}`);
    // Returns full state from Durable Object
  }

  async updateState(updates: Partial<ChatSessionState>): Promise<void> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    // Updates state in Durable Object
  }
}
```

**Key Points:**
- Provides a simple API for frontend to interact with Durable Objects
- Uses Next.js API routes as proxy when Worker is not running
- Falls back to localStorage in development if Worker unavailable

## How Data Persists

### Storage Flow

1. **Write Operation:**
   ```
   Frontend → API Route → Worker → Durable Object
                                      ↓
                                   In-Memory State (this.chatState)
                                      ↓
                                   Durable Storage (this.state.storage.put())
   ```

2. **Read Operation:**
   ```
   Frontend → API Route → Worker → Durable Object
                                      ↓
                                   Check In-Memory Cache (this.chatState)
                                      ↓
                                   If null, Load from Storage (this.state.storage.get())
                                      ↓
                                   Return to Frontend
   ```

### Storage Structure

```typescript
// Stored in Durable Object storage
Key: "chatState"
Value: {
  messages: [
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' }
  ],
  pendingMatch: {
    tutor: { id: 1, name: '...' },
    matchScore: 0.95,
    ...
  },
  lastSearchCriteria: {
    skill: 'Python',
    day: 'Monday',
    ...
  },
  availableTutorsList: [...],
  bookingInfo: {
    studentName: '...',
    studentEmail: '...',
    ...
  },
  createdAt: 1703123456789,
  lastAccessedAt: 1703123456789
}
```

## Unique Properties of Durable Objects

### 1. **Single Instance Per ID**
- Same `sessionId` always routes to the **same** Durable Object instance
- Guaranteed consistency - no race conditions
- Perfect for chat sessions (one session = one instance)

### 2. **In-Memory with Auto-Persistence**
- State kept in memory for fast access
- Automatically persisted to durable storage
- Survives restarts, deployments, and failures

### 3. **Transactional Storage**
- `storage.put()` and `storage.get()` are atomic
- Guaranteed ordering of operations
- No need for locks or queues

### 4. **Low Latency**
- Data stored close to users (Cloudflare's edge network)
- In-memory access for reads
- Sub-millisecond response times

## Example: Saving a Message

```typescript
// 1. Frontend sends message
await sessionClient.addMessage({
  role: 'user',
  content: 'I need help with Python'
});

// 2. Next.js API route proxies to Worker
POST /api/chat/session/session-123/messages
→ http://localhost:8787/api/chat/session/session-123/messages

// 3. Worker routes to Durable Object
const id = env.CHAT_SESSION.idFromName('session-123');
const stub = env.CHAT_SESSION.get(id);
return stub.fetch(doRequest);

// 4. Durable Object handles request
async addMessage(message: ChatMessage): Promise<Response> {
  // Load state if needed
  if (!this.chatState) await this.loadState();
  
  // Add message to in-memory state
  this.chatState.messages.push(newMessage);
  this.chatState.lastAccessedAt = Date.now();
  
  // Save to durable storage (persists across restarts)
  await this.saveState();  // this.state.storage.put('chatState', this.chatState)
  
  return new Response(JSON.stringify({ success: true }));
}
```

## Comparison: Durable Objects vs. Other Storage

| Feature | Durable Objects | localStorage | D1 Database | Redis |
|---------|----------------|--------------|-------------|-------|
| **Persistent** | ✅ Yes | ❌ Browser only | ✅ Yes | ❌ Volatile |
| **Low Latency** | ✅ Sub-ms | ✅ Instant | ❌ ~10ms | ✅ Sub-ms |
| **Stateful** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Single Instance** | ✅ Guaranteed | ❌ No | ❌ No | ❌ No |
| **Transactional** | ✅ Yes | ❌ No | ✅ Yes | ⚠️ Partial |
| **Edge Distributed** | ✅ Yes | ❌ No | ⚠️ Limited | ❌ No |
| **Auto-Scaling** | ✅ Yes | ❌ No | ✅ Yes | ⚠️ Manual |

## Benefits for Chat Application

1. **Session Persistence** - Chat history survives page refreshes
2. **Multi-Tab Support** - Same sessionId → same state across tabs
3. **Reliability** - Data persisted even if Worker restarts
4. **Performance** - In-memory access with automatic persistence
5. **Simplicity** - No database queries, just simple get/put operations
6. **Scalability** - Each session is independent, scales automatically

## Production Deployment

When deployed to Cloudflare:
- Durable Objects run on Cloudflare's edge network
- Data automatically replicated across multiple data centers
- No need for database setup or maintenance
- Pay per request, not per instance

## Current Implementation

- ✅ Durable Objects store chat state
- ✅ In-memory cache for fast access
- ✅ Automatic persistence to storage
- ✅ Single instance per session (no conflicts)
- ✅ Fallback to localStorage when Worker not running (dev mode)

