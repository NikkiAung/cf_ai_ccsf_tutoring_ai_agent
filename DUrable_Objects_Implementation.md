# Durable Objects Implementation for Chat State

## Overview

This implementation adds **Cloudflare Durable Objects** for persistent chat session state management. Durable Objects provide:

- ✅ **Persistent state** across page refreshes
- ✅ **Globally unique sessions** (one per user)
- ✅ **Strong consistency** for chat state
- ✅ **Coordinate between requests** if needed

Reference: [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)

## Files Created

### 1. Durable Object Class
**File:** `durable-objects/chat-session.ts`

Main Durable Object class that manages chat state:
- Messages history
- Pending matches
- Booking information
- Search criteria
- Available tutors list

### 2. Worker Entry Point
**File:** `src/index.ts`

Cloudflare Worker that:
- Exports the ChatSession Durable Object
- Routes requests to Durable Objects
- Works when deployed to Cloudflare Workers

### 3. API Routes (Next.js)
**Files:**
- `app/api/chat/session/[sessionId]/route.ts`
- `app/api/chat/session/[sessionId]/messages/route.ts`

API routes that:
- Work in Next.js environment
- Fall back gracefully when Durable Objects aren't available
- Provide HTTP interface to Durable Objects

### 4. Client Library
**File:** `lib/chat-session-client.ts`

TypeScript client that:
- Works in both Workers and Next.js
- Provides unified interface
- Handles session ID generation

## Configuration

### wrangler.toml

Added Durable Objects configuration:

```toml
# Durable Objects binding
[[durable_objects.bindings]]
name = "CHAT_SESSION"
class_name = "ChatSession"
script_name = "ccsf-tutoring-ai-agent"

# Durable Object class definition
[[migrations]]
tag = "v1"
new_classes = ["ChatSession"]
```

## How It Works

### Architecture

```
User Browser
    ↓
Next.js Frontend (ChatInterface.tsx)
    ↓
ChatSessionClient (lib/chat-session-client.ts)
    ↓
┌─────────────────────────────────────┐
│  Option 1: Next.js API Routes       │
│  /api/chat/session/[sessionId]      │
│  (HTTP API - works in Next.js)      │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Option 2: Cloudflare Workers       │
│  src/index.ts                       │
│  (Direct Durable Object access)     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Durable Object: ChatSession        │
│  durable-objects/chat-session.ts    │
│  (Persistent state + storage)       │
└─────────────────────────────────────┘
```

### State Persistence

**In-memory state:**
- Fast access to current session state
- Loaded on first request
- Cached in Durable Object instance

**Durable storage:**
- Persisted to SQLite-backed storage
- Survives Durable Object restarts
- Automatically saved on state changes

### Session Management

Each chat session gets a **globally unique ID**:
- Generated on first chat (stored in localStorage)
- Format: `session-{timestamp}-{random}`
- One Durable Object instance per session ID

## Features

### 1. Message History

```typescript
// Add message
await chatClient.addMessage({
  role: 'user',
  content: 'I need help with Python',
});

// Get all messages
const messages = await chatClient.getMessages();
```

**Persists across:**
- Page refreshes ✅
- Browser tabs (same session) ✅
- Network disconnections ✅

### 2. Pending Match

```typescript
// Store pending match
await chatClient.setPendingMatch(matchResult);

// Retrieve later
const match = await chatClient.getPendingMatch();
```

**Use case:** User can refresh page and still see matched tutor.

### 3. Booking Info

```typescript
// Store multi-step booking form data
await chatClient.setBookingInfo({
  studentName: 'John',
  studentEmail: 'john@example.com',
  step: 'name-email',
  // ... other fields
});
```

**Use case:** If user refreshes during booking, form state is preserved.

### 4. Search Criteria

```typescript
// Store last search
await chatClient.setSearchCriteria({
  skill: 'Python',
  day: 'Monday',
  time: '10:00',
});
```

**Use case:** "Show me other tutors" works even after page refresh.

## Integration with ChatInterface

### Before (React State Only)

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [pendingMatch, setPendingMatch] = useState<MatchTutorResponse | null>(null);
// Lost on page refresh ❌
```

### After (Durable Objects + React State)

```typescript
// Initialize client
const chatClient = new ChatSessionClient(getSessionId());

// Load state from Durable Object
useEffect(() => {
  const loadState = async () => {
    const state = await chatClient.getState();
    if (state) {
      setMessages(state.messages);
      setPendingMatch(state.pendingMatch);
      // ... restore all state
    }
  };
  loadState();
}, []);

// Save state to Durable Object
await chatClient.addMessage(newMessage);
await chatClient.setPendingMatch(match);
// Persists across refreshes ✅
```

## Deployment

### Step 1: Deploy Worker with Durable Object

```bash
# Build the Worker
npm run build

# Deploy to Cloudflare Workers
wrangler deploy
```

This deploys:
- `src/index.ts` as the main Worker
- `ChatSession` Durable Object class

### Step 2: Configure Bindings

The `wrangler.toml` already includes:
- Durable Objects binding
- D1 database binding
- Vectorize binding

### Step 3: Test

```bash
# Test locally (requires --remote for Durable Objects)
wrangler dev --remote

# Test deployed Worker
curl https://your-worker.workers.dev/api/chat/session/test-session/messages
```

## Benefits

### ✅ What You Gain

1. **Persistent State**
   - Chat history survives page refresh
   - Booking form state preserved
   - Matches and search criteria saved

2. **Multi-Device Support**
   - Same session ID = same chat state
   - User can switch devices (if session ID shared)

3. **Strong Consistency**
   - Durable Objects guarantee consistency
   - No race conditions
   - Atomic state updates

4. **Scalability**
   - One Durable Object per session
   - Automatically scales to millions
   - Geographic distribution

### ⚠️ Trade-offs

1. **Complexity**
   - More moving parts
   - Requires Workers deployment
   - Fallback logic needed for Next.js

2. **Latency**
   - Slight delay for state persistence
   - Network round-trip to Durable Object

3. **Cost**
   - Durable Objects have usage-based pricing
   - Storage costs for persisted state

## Fallback Behavior

### In Next.js (Local Dev)

When Durable Objects aren't available:
- API routes return 503
- `ChatSessionClient` gracefully handles errors
- Falls back to React state only (current behavior)

### In Workers (Production)

When deployed to Cloudflare Workers:
- Direct Durable Object access
- Full state persistence
- All features work

## Next Steps

To fully integrate:

1. **Update ChatInterface.tsx** to use `ChatSessionClient`
2. **Deploy Worker** to Cloudflare
3. **Test persistence** across page refreshes
4. **Add session sharing** if needed (multi-device)

## Example Usage

```typescript
import { ChatSessionClient, getSessionId } from '@/lib/chat-session-client';

// In ChatInterface component
const sessionId = getSessionId(); // Get or create session ID
const chatClient = new ChatSessionClient(sessionId);

// On mount, load state
useEffect(() => {
  chatClient.getState().then(state => {
    if (state) {
      setMessages(state.messages);
      setPendingMatch(state.pendingMatch);
      setBookingInfo(state.bookingInfo);
    }
  });
}, []);

// When adding message, persist it
const handleAddMessage = async (message: Message) => {
  setMessages(prev => [...prev, message]);
  await chatClient.addMessage(message); // Persist to Durable Object
};

// When setting match, persist it
const handleSetMatch = async (match: MatchTutorResponse) => {
  setPendingMatch(match);
  await chatClient.setPendingMatch(match); // Persist to Durable Object
};
```

## Resources

- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects Get Started](https://developers.cloudflare.com/durable-objects/get-started/)
- [Durable Objects Storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Durable Objects Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

