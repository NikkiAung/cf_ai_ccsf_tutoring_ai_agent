# Durable Objects Setup Guide

## Overview

This guide shows you how to set up and use Cloudflare Durable Objects for persistent chat state in your application.

Reference: [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)

## What Are Durable Objects?

**Durable Objects** are stateful Workers that provide:
- ✅ **Persistent state** across page refreshes
- ✅ **Globally unique sessions** (one per user)
- ✅ **Strong consistency** for state management
- ✅ **Coordinate between requests** if needed

**Key Features:**
- Each Durable Object has a globally-unique name
- Durable storage attached (SQLite-backed)
- Automatically provisioned close to users
- Can have millions around the world

## Files Created

1. **`durable-objects/chat-session.ts`** - Durable Object class for chat state
2. **`src/index.ts`** - Worker entry point that exports the Durable Object
3. **`lib/chat-session-client.ts`** - Client library for accessing Durable Objects
4. **`app/api/chat/session/[sessionId]/route.ts`** - Next.js API route
5. **`app/api/chat/session/[sessionId]/messages/route.ts`** - Messages API route

## Setup Steps

### Step 1: Verify Configuration

Check `wrangler.toml` has Durable Objects binding:

```toml
[[durable_objects.bindings]]
name = "CHAT_SESSION"
class_name = "ChatSession"
script_name = "ccsf-tutoring-ai-agent"

[[migrations]]
tag = "chat-session-v1"
new_classes = ["ChatSession"]
```

### Step 2: Deploy Worker with Durable Object

```bash
# Build the Worker
npm run build

# Deploy to Cloudflare Workers
wrangler deploy
```

**Note:** Durable Objects require deployment to Cloudflare Workers. They don't work in local Next.js dev without Workers.

### Step 3: Test Locally (Optional)

To test Durable Objects locally, you need to run with `wrangler dev`:

```bash
# Run Worker locally with Durable Objects support
wrangler dev src/index.ts --remote
```

The `--remote` flag enables Durable Objects (they only work on Cloudflare's infrastructure).

### Step 4: Integrate with ChatInterface

Update `ChatInterface.tsx` to use the Durable Object client:

```typescript
import { ChatSessionClient, getSessionId } from '@/lib/chat-session-client';

// In component
const sessionId = getSessionId(); // Get or create session ID
const chatClient = new ChatSessionClient(sessionId);

// Load state on mount
useEffect(() => {
  const loadState = async () => {
    const state = await chatClient.getState();
    if (state) {
      setMessages(state.messages);
      setPendingMatch(state.pendingMatch);
      setBookingInfo(state.bookingInfo);
      setAvailableTutorsList(state.availableTutorsList);
      setLastSearchCriteria(state.lastSearchCriteria);
    }
  };
  loadState();
}, []);

// Persist state when it changes
const handleAddMessage = async (message: Message) => {
  setMessages(prev => [...prev, message]);
  await chatClient.addMessage(message); // Persist to Durable Object
};
```

## How It Works

### Architecture

```
┌─────────────────────────────────┐
│   ChatInterface.tsx (React)     │
│   (Frontend Component)          │
└──────────────┬──────────────────┘
               │
               │ Uses ChatSessionClient
               ↓
┌─────────────────────────────────┐
│  ChatSessionClient              │
│  (lib/chat-session-client.ts)   │
└──────────────┬──────────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
┌──────────────┐  ┌──────────────────┐
│ Next.js API  │  │ Cloudflare       │
│ Routes       │  │ Workers          │
│ (HTTP)       │  │ (Direct Access)  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └───────────┬───────┘
                   ↓
       ┌───────────────────────┐
       │  Durable Object:      │
       │  ChatSession          │
       │  (Persistent State)   │
       └───────────────────────┘
```

### State Persistence

**In-memory state:**
- Fast access to current session
- Loaded on first request
- Cached in Durable Object instance

**Durable storage (SQLite-backed):**
- Persisted to disk
- Survives restarts
- Automatically saved on changes

### Session Management

Each chat session gets a **globally unique ID**:
- Generated on first chat
- Stored in `localStorage` (browser)
- Format: `session-{timestamp}-{random}`
- One Durable Object instance per session ID

## API Endpoints

### GET `/api/chat/session/[sessionId]`
Get full chat session state

**Response:**
```json
{
  "messages": [...],
  "pendingMatch": {...},
  "bookingInfo": {...},
  "createdAt": 1234567890,
  "lastAccessedAt": 1234567890
}
```

### PUT `/api/chat/session/[sessionId]`
Update chat session state

**Request:**
```json
{
  "messages": [...],
  "pendingMatch": {...}
}
```

### GET `/api/chat/session/[sessionId]/messages`
Get all messages

**Response:**
```json
[
  { "role": "user", "content": "..." },
  { "role": "assistant", "content": "..." }
]
```

### POST `/api/chat/session/[sessionId]/messages`
Add a message

**Request:**
```json
{
  "role": "user",
  "content": "I need help with Python"
}
```

### PUT `/api/chat/session/[sessionId]/pending-match`
Set pending match

### PUT `/api/chat/session/[sessionId]/booking-info`
Set booking info

### POST `/api/chat/session/[sessionId]/reset`
Reset chat session

## Usage Examples

### Example 1: Load Chat State on Page Load

```typescript
// In ChatInterface.tsx
useEffect(() => {
  const sessionId = getSessionId();
  const chatClient = new ChatSessionClient(sessionId);

  const loadState = async () => {
    const state = await chatClient.getState();
    if (state && state.messages.length > 0) {
      // Restore chat state
      setMessages(state.messages);
      setPendingMatch(state.pendingMatch);
      if (state.bookingInfo) {
        setBookingInfo(state.bookingInfo);
      }
    }
  };

  loadState();
}, []);
```

### Example 2: Persist Messages

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... handle user input
  const userMessage = input.trim();
  
  // Add to React state
  setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
  
  // Persist to Durable Object
  await chatClient.addMessage({ role: 'user', content: userMessage });
  
  // ... handle assistant response
  const assistantMessage = await getAssistantResponse();
  
  // Add to React state
  setMessages(prev => [...prev, assistantMessage]);
  
  // Persist to Durable Object
  await chatClient.addMessage(assistantMessage);
};
```

### Example 3: Persist Booking State

```typescript
// When starting booking
setBookingInfo({
  studentName: '',
  studentEmail: '',
  ccsfEmail: '',
  slot: { day: 'Monday', time: '10:00-10:30', mode: 'online' },
  step: 'name-email',
});

// Persist to Durable Object
await chatClient.setBookingInfo(bookingInfo);

// Later, when user refreshes, restore:
const state = await chatClient.getState();
if (state?.bookingInfo) {
  setBookingInfo(state.bookingInfo);
}
```

## Benefits

### ✅ Persistent State

**Before (React only):**
- ❌ Chat history lost on refresh
- ❌ Booking form state lost
- ❌ Matches not preserved

**After (Durable Objects):**
- ✅ Chat history persists
- ✅ Booking form state preserved
- ✅ Matches saved across refreshes

### ✅ Multi-Device Support (Future)

With session ID sharing, users can:
- Start chat on desktop
- Continue on mobile
- Same chat state everywhere

### ✅ Strong Consistency

- No race conditions
- Atomic state updates
- Guaranteed consistency

## Limitations

### ⚠️ Workers Only

Durable Objects **only work in Cloudflare Workers**, not in pure Next.js:
- ✅ Works when deployed to Cloudflare Workers
- ❌ Doesn't work in Next.js local dev (returns 503)
- ⚠️ Falls back to React state only in Next.js

### ⚠️ Deployment Required

To use Durable Objects, you must:
1. Deploy Worker to Cloudflare
2. Use API routes that access Workers
3. Or deploy entire app to Cloudflare Pages

### ⚠️ Costs

Durable Objects have usage-based pricing:
- **Free plan**: SQLite-backed Durable Objects available
- **Paid plan**: Higher limits, better performance
- See: [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

## Testing

### Test Locally (With Workers)

```bash
# Run Worker with Durable Objects support
wrangler dev src/index.ts --remote

# Test API endpoint
curl http://localhost:8787/api/chat/session/test-session/messages
```

### Test in Production

```bash
# Deploy Worker
wrangler deploy

# Test API endpoint
curl https://your-worker.workers.dev/api/chat/session/test-session/messages
```

## Troubleshooting

### Error: "Durable Objects not available"

**Problem:** Durable Objects only work in Cloudflare Workers environment.

**Solution:**
- Deploy to Cloudflare Workers
- Or use `wrangler dev --remote` for local testing
- Falls back gracefully in Next.js (returns 503)

### Error: "ChatSession class not found"

**Problem:** Durable Object class not exported correctly.

**Solution:**
- Ensure `src/index.ts` exports `ChatSession`
- Check `wrangler.toml` has correct class name
- Verify migration includes `ChatSession`

### State Not Persisting

**Problem:** State lost on refresh.

**Solution:**
- Ensure Durable Object is deployed
- Check API routes are calling Durable Object
- Verify state is being saved (check `saveState()` calls)

## Next Steps

1. **Deploy Worker** with Durable Object
2. **Update ChatInterface** to use `ChatSessionClient`
3. **Test persistence** across page refreshes
4. **Add error handling** for Next.js fallback
5. **Optional:** Add session sharing for multi-device

## Resources

- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Get Started Guide](https://developers.cloudflare.com/durable-objects/get-started/)
- [Storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

