# How Chat Data is Stored in Cloudflare Durable Objects

## Example: User Types "I want help with python tutor"

Let's trace the **exact flow** of how this message gets stored in Durable Objects storage.

---

## Step-by-Step Flow

### **Step 1: User Types Message in Frontend**

**File:** `components/schedule/ChatInterface.tsx`

```typescript
// User types "I want help with python tutor" and hits Enter
const handleSubmit = async (e: React.FormEvent) => {
  const userMessage = input.trim().toLowerCase();  // "i want help with python tutor"
  const userMessageOriginal = input.trim();        // "I want help with python tutor"
  
  // Create message object
  const newUserMessage: Message = { 
    role: 'user', 
    content: userMessageOriginal 
  };
  
  // Add to local state (React)
  setMessages((prev) => [...prev, newUserMessage]);
  
  // Save to Durable Objects (async, doesn't block UI)
  sessionClient.addMessage(newUserMessage).catch(console.error);
  
  // Continue with AI matching logic...
}
```

**What happens:**
- ✅ Message added to React state (instant UI update)
- ✅ Message sent to Durable Objects (in background)

---

### **Step 2: Frontend Calls ChatSessionClient**

**File:** `lib/chat-session-client.ts`

```typescript
// sessionClient.addMessage() is called
async addMessage(message: Omit<Message, 'timestamp'>): Promise<void> {
  // Constructs URL to Next.js API route
  const url = `/api/chat/session/${this.sessionId}/messages`;
  // Example: /api/chat/session/session-1763264606917-w2j2kfd45/messages
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),  // { role: 'user', content: 'I want help with python tutor' }
  });
}
```

**What gets sent:**
```json
POST /api/chat/session/session-1763264606917-w2j2kfd45/messages
Content-Type: application/json

{
  "role": "user",
  "content": "I want help with python tutor"
}
```

---

### **Step 3: Next.js API Route Receives Request**

**File:** `app/api/chat/session/[sessionId]/messages/route.ts`

```typescript
export async function POST(request: Request, { params }) {
  const { sessionId } = await params;  // "session-1763264606917-w2j2kfd45"
  const body = await request.json();    // { role: 'user', content: 'I want help with python tutor' }
  
  // Check if we have direct Durable Object access (only in Workers environment)
  const stub = getChatSession(sessionId);
  
  if (stub) {
    // Direct access (rare, only if Next.js runs in Workers)
    // ...
  } else {
    // Proxy to deployed Worker (most common case)
    return proxyToWorker(request, sessionId, JSON.stringify(body));
  }
}
```

**What happens:**
- ✅ Extracts sessionId and message from request
- ✅ Determines we need to proxy to Worker
- ✅ Calls `proxyToWorker()` with message

---

### **Step 4: Next.js Proxies to Deployed Worker**

**File:** `app/api/chat/session/[sessionId]/messages/route.ts`

```typescript
async function proxyToWorker(request: Request, sessionId: string, bodyText?: string) {
  // Gets Worker URL from environment
  const workerUrl = getWorkerUrl();  
  // Returns: https://ccsf-tutoring-ai-agent.aoo13.workers.dev
  
  // Constructs Worker request URL
  const workerRequestUrl = `${workerUrl}/api/chat/session/${sessionId}/messages`;
  // https://ccsf-tutoring-ai-agent.aoo13.workers.dev/api/chat/session/session-1763264606917-w2j2kfd45/messages
  
  // Forwards request to deployed Worker
  const response = await fetch(workerRequestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyText,  // JSON string of message
  });
  
  return response;
}
```

**What gets sent to Worker:**
```http
POST https://ccsf-tutoring-ai-agent.aoo13.workers.dev/api/chat/session/session-1763264606917-w2j2kfd45/messages
Content-Type: application/json

{
  "role": "user",
  "content": "I want help with python tutor"
}
```

---

### **Step 5: Worker Routes to Durable Object**

**File:** `src/index.ts`

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;  // "/api/chat/session/session-1763264606917-w2j2kfd45/messages"
    
    if (path.startsWith('/api/chat/session/')) {
      // Extract sessionId from path
      const sessionIdMatch = path.match(/\/api\/chat\/session\/([^/]+)(.*)/);
      const sessionId = sessionIdMatch[1];  // "session-1763264606917-w2j2kfd45"
      const remainingPath = sessionIdMatch[2];  // "/messages"
      
      // Create Durable Object ID from sessionId
      // Same sessionId always produces same ID (deterministic)
      const id = env.CHAT_SESSION.idFromName(sessionId);
      
      // Get stub to communicate with Durable Object instance
      // This creates or gets existing instance for this sessionId
      const stub = env.CHAT_SESSION.get(id);
      
      // Forward request to Durable Object
      // Durable Object will handle /messages route
      const doRequest = new Request(
        `http://durable-object/messages`,
        {
          method: 'POST',
          headers: request.headers,
          body: request.body,
        }
      );
      
      return stub.fetch(doRequest);
    }
  }
}
```

**What happens:**
- ✅ Worker extracts sessionId from URL path
- ✅ Creates Durable Object ID using `idFromName()` (deterministic hash)
- ✅ Gets stub to Durable Object instance
- ✅ **Same sessionId → Same Durable Object instance** (guaranteed!)
- ✅ Forwards POST request to Durable Object's `/messages` endpoint

---

### **Step 6: Durable Object Receives Request**

**File:** `durable-objects/chat-session.ts`

```typescript
export class ChatSession {
  state: DurableObjectState;  // Provides access to storage
  private chatState: ChatSessionState | null = null;  // In-memory cache
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;  // "/messages"
    
    switch (path) {
      case '/messages':
        if (request.method === 'POST') {
          const body = await request.json() as ChatMessage;
          // body = { role: 'user', content: 'I want help with python tutor' }
          return this.addMessage(body);
        }
        break;
      // ... other routes
    }
  }
}
```

**What happens:**
- ✅ Durable Object receives POST to `/messages`
- ✅ Parses message from request body
- ✅ Calls `addMessage()` method

---

### **Step 7: Durable Object Adds Message and Saves**

**File:** `durable-objects/chat-session.ts`

```typescript
private async addMessage(message: ChatMessage): Promise<Response> {
  // Step 7a: Load state if not in memory
  if (!this.chatState) {
    await this.loadState();
  }
  
  // Step 7b: Create new message object
  const newMessage: Message = {
    role: message.role,           // 'user'
    content: message.content,     // 'I want help with python tutor'
    tutorMatch: message.tutorMatch,
  };
  
  // Step 7c: Add to in-memory state (FAST)
  this.chatState!.messages.push(newMessage);
  // Now: this.chatState.messages = [
  //   { role: 'assistant', content: 'Hi! 👋 I'm your AI...' },
  //   { role: 'user', content: 'I want help with python tutor' }  // ← NEW
  // ]
  
  // Step 7d: Update last accessed timestamp
  this.chatState!.lastAccessedAt = Date.now();
  
  // Step 7e: Save to durable storage (PERSISTENT)
  await this.saveState();
  
  return new Response(JSON.stringify({ success: true, message: newMessage }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**What happens:**
- ✅ Loads existing state from storage (if any)
- ✅ Adds new message to `messages` array in memory
- ✅ Updates timestamp
- ✅ **Calls `saveState()` to persist to storage**

---

### **Step 8: Save to Durable Storage**

**File:** `durable-objects/chat-session.ts`

```typescript
private async loadState(): Promise<void> {
  // Load existing state from durable storage
  const stored = await this.state.storage.get<ChatSessionState>('chatState');
  
  if (stored) {
    // Existing state found
    this.chatState = stored;
  } else {
    // First time - initialize new state
    await this.initializeState();
  }
}

private async saveState(): Promise<void> {
  if (this.chatState) {
    // Save entire state object to durable storage
    // Key: "chatState"
    // Value: Full ChatSessionState object
    await this.state.storage.put('chatState', this.chatState);
  }
}
```

**What gets stored:**
```typescript
// Cloudflare Durable Object Storage
// Key: "chatState"
// Value: {
//   messages: [
//     {
//       role: 'assistant',
//       content: 'Hi! 👋 I'm your AI scheduling assistant...'
//     },
//     {
//       role: 'user',
//       content: 'I want help with python tutor'  // ← NEW MESSAGE STORED HERE
//     }
//   ],
//   pendingMatch: null,
//   lastSearchCriteria: null,
//   availableTutorsList: [],
//   bookingInfo: null,
//   createdAt: 1763264606917,
//   lastAccessedAt: 1763267948600  // ← UPDATED
// }
```

**What happens:**
- ✅ `this.state.storage.put('chatState', this.chatState)` saves to Cloudflare
- ✅ Storage is **persistent** - survives restarts
- ✅ Storage is **replicated** - backed up across data centers
- ✅ Storage is **transactional** - atomic operation

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                   │
│ User types: "I want help with python tutor"                    │
│ Component: ChatInterface.tsx                                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND STATE                                               │
│ sessionClient.addMessage({                                      │
│   role: 'user',                                                 │
│   content: 'I want help with python tutor'                     │
│ })                                                              │
│ Component: lib/chat-session-client.ts                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼ HTTP POST
┌─────────────────────────────────────────────────────────────────┐
│ 3. NEXT.JS API ROUTE                                            │
│ POST /api/chat/session/{sessionId}/messages                     │
│ Component: app/api/chat/session/[sessionId]/messages/route.ts   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼ Proxy
┌─────────────────────────────────────────────────────────────────┐
│ 4. DEPLOYED WORKER                                              │
│ POST https://ccsf-tutoring-ai-agent...workers.dev/api/chat/... │
│ Component: src/index.ts                                         │
│ • Extracts sessionId                                            │
│ • idFromName(sessionId) → Durable Object ID                     │
│ • get(id) → Durable Object stub                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼ Route to Durable Object
┌─────────────────────────────────────────────────────────────────┐
│ 5. DURABLE OBJECT INSTANCE                                      │
│ One instance per sessionId (unique per chat session)            │
│ Component: durable-objects/chat-session.ts                      │
│                                                                 │
│ async fetch(request) {                                          │
│   if (path === '/messages' && method === 'POST') {              │
│     return this.addMessage(message);                            │
│   }                                                             │
│ }                                                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. IN-MEMORY STATE (FAST)                                       │
│ this.chatState.messages.push(newMessage);                       │
│ • role: 'user'                                                  │
│ • content: 'I want help with python tutor'                     │
│ • Stored in RAM for fast access                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼ Auto-save
┌─────────────────────────────────────────────────────────────────┐
│ 7. DURABLE STORAGE (PERSISTENT)                                 │
│ this.state.storage.put('chatState', this.chatState);            │
│                                                                 │
│ Key: "chatState"                                                │
│ Value: {                                                        │
│   messages: [                                                   │
│     { role: 'assistant', content: '...' },                     │
│     { role: 'user', content: 'I want help with python tutor' } │
│   ],                                                            │
│   ...                                                           │
│ }                                                               │
│                                                                 │
│ Stored in: Cloudflare Durable Object Storage                    │
│ • Persistent across restarts                                    │
│ • Replicated across data centers                                │
│ • Encrypted and backed up                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Happens When User Refreshes Page?

After the message is stored, if the user refreshes the page:

```typescript
// Component mounts
useEffect(() => {
  async function loadState() {
    // Loads state from Durable Objects
    const state = await sessionClient.getState();
    
    // state.messages = [
    //   { role: 'assistant', content: 'Hi! 👋...' },
    //   { role: 'user', content: 'I want help with python tutor' }  // ← STILL THERE!
    // ]
    
    // Restores messages to React state
    setMessages(state.messages);
  }
  loadState();
}, []);
```

**Result:** Message persists! It was saved in Durable Objects storage, so it survives page refreshes.

---

## Storage Location Details

### **Where is it stored?**

1. **In-Memory (RAM):**
   - `this.chatState` in Durable Object instance
   - Fast access (microseconds)
   - Lost on instance restart (but auto-reloaded from storage)

2. **Durable Storage (Cloudflare):**
   - `this.state.storage.get('chatState')` / `put('chatState', ...)`
   - Persistent across restarts
   - Stored in your Cloudflare account
   - SQLite-backed (since you're using `new_sqlite_classes`)
   - Replicated across multiple data centers

### **Storage Format:**

```typescript
// Key in storage
"chatState"

// Value (JSON object)
{
  messages: Message[],              // Array of all chat messages
  pendingMatch: MatchTutorResponse | null,  // Currently selected tutor
  lastSearchCriteria: MatchTutorRequest | null,  // Last search query
  availableTutorsList: MatchTutorResponse[],  // All matching tutors
  bookingInfo: BookingInfo | null,  // Booking form data
  createdAt: number,                // Timestamp when session created
  lastAccessedAt: number           // Timestamp of last access
}
```

---

## Key Points

1. **Single Instance Guarantee:**
   - Same `sessionId` always routes to the **same** Durable Object instance
   - `idFromName(sessionId)` produces deterministic ID

2. **Two-Tier Storage:**
   - **In-memory:** Fast access, auto-reloaded on startup
   - **Durable storage:** Persistent, survives everything

3. **Automatic Persistence:**
   - Every `saveState()` call persists to durable storage
   - No manual save/load needed
   - Atomic operations (guaranteed consistency)

4. **Your Data:**
   - Stored in **your Cloudflare account**
   - Accessible via Worker
   - Can see metrics in Cloudflare dashboard
   - Persists until explicitly deleted

---

## Testing the Flow

You can verify this is working:

1. **Send a message** in chat: "I want help with python tutor"
2. **Check browser console:** Should see `✅ Using Cloudflare Durable Objects`
3. **Check Network tab:** Should see POST to Worker URL
4. **Check Cloudflare Dashboard:** 
   - Durable Objects → Metrics → Requests should increase
   - Storage Operations should increase
5. **Refresh page:** Message should still be there! ✅

That's exactly how your message gets stored! 🎉

