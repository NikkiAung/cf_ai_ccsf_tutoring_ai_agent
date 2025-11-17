# LangChain Integration Guide

This document explains how LangChain has been integrated into the CCSF Tutoring AI Agent, implementing the key concepts from the LangChain lessons.

## ✅ Implemented Features

### 1. High-Quality SYSTEM_PROMPT (Lesson 1)
**Location:** `lib/ai.ts`, `lib/langchain-agent.ts`, `lib/langchain-simple.ts`

**Implementation:**
- Added detailed system prompts that explicitly prevent hallucination
- Clear rules: "NEVER make up tutor names, skills, or availability"
- Step-by-step thinking instructions
- Specific guidance on accuracy and honesty

**Example:**
```typescript
const SYSTEM_PROMPT = `You are a helpful AI scheduling assistant...

CRITICAL RULES:
1. **NEVER make up tutor names, skills, or availability**
2. **ALWAYS verify tutor information**
3. **Think step-by-step**
...
`;
```

### 2. Streaming Mode (Lesson 3)
**Location:** `lib/langchain-simple.ts`, `app/api/chat/stream/route.ts`

**Implementation:**
- Created `streamChatResponse()` function that yields chunks as they arrive
- Server-Sent Events (SSE) API endpoint for streaming
- Real-time token-by-token response display

**Usage:**
```typescript
for await (const chunk of streamChatResponse(input, chatHistory)) {
  // Display chunk immediately
  setMessages(prev => [...prev, { content: chunk }]);
}
```

### 3. Tools (Lesson 4)
**Location:** `lib/langchain-agent.ts`

**Implementation:**
- `searchTutorsTool`: Search for tutors matching criteria
- `getAllAvailableTutorsTool`: Get all matching tutors (for "show me other tutors")
- Detailed tool descriptions with Google-style argument docs
- Tools use existing RAG pipeline for semantic search

**Example:**
```typescript
const searchTutorsTool = new DynamicStructuredTool({
  name: 'search_tutors',
  description: `Search for tutors matching specific criteria...`,
  schema: z.object({...}),
  func: async ({ skill, day, time, mode }) => {...}
});
```

### 4. Improved Prompts in Existing Code
**Location:** `lib/ai.ts`

**Changes:**
- Enhanced the tutor matching prompt with explicit rules
- Added "CRITICAL RULES" section to prevent hallucination
- More specific instructions for JSON response format
- Emphasis on using exact tutor names and data

## 🔄 Integration Points

### Current Architecture

```
ChatInterface.tsx
    ↓
/api/match (existing) → Uses improved prompts in lib/ai.ts
/api/chat/stream (new) → Uses LangChain streaming
    ↓
lib/langchain-simple.ts → Streaming chat responses
lib/langchain-agent.ts → Full agent with tools (optional)
```

### Two Integration Approaches

#### Approach 1: Simple Streaming (Recommended for now)
- Uses `lib/langchain-simple.ts`
- Provides streaming chat responses
- Uses high-quality prompts
- No tools (relies on existing `/api/match` endpoint)

#### Approach 2: Full Agent (Future enhancement)
- Uses `lib/langchain-agent.ts`
- Includes tools for tutor searching
- More autonomous agent behavior
- Requires more testing and refinement

## 📝 Usage Examples

### Streaming Chat Response

```typescript
// In ChatInterface.tsx
const handleStreamingChat = async (input: string) => {
  const chatHistory = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let assistantMessage = '';
  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

  for await (const chunk of streamChatResponse(input, chatHistory)) {
    assistantMessage += chunk;
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1].content = assistantMessage;
      return updated;
    });
  }
};
```

### Using the Agent with Tools

```typescript
import { createTutorMatchingAgent, streamAgentResponse } from '@/lib/langchain-agent';

const agent = createTutorMatchingAgent();
const response = await streamAgentResponse(agent, "I need help with Python");
```

## 🚀 Next Steps (Optional Enhancements)

### Memory/Checkpointer (Lesson 6)
**Status:** Not yet implemented

**To add:**
```typescript
import { InMemorySaver } from 'langgraph/checkpoint/memory';

const checkpointer = new InMemorySaver();
const agent = createAgent({
  checkpointer,
  // ...
});
```

### Structured Outputs (Lesson 7)
**Status:** Partially implemented (JSON format in tutor matching)

**To enhance:**
```typescript
import { z } from 'zod';

const TutorMatchSchema = z.object({
  tutorName: z.string(),
  reasoning: z.string(),
  availableSlots: z.array(z.object({...})),
});

const agent = createAgent({
  response_format: TutorMatchSchema,
});
```

### Dynamic Prompts (Lesson 8)
**Status:** Not yet implemented

**Use case:** Adjust prompts based on user role or context

### Human-in-the-Loop (Lesson 9)
**Status:** Not yet implemented

**Use case:** Require approval before booking sessions

## 📦 Dependencies

```json
{
  "@langchain/core": "^1.0.5",
  "@langchain/openai": "^1.1.1",
  "@langchain/langgraph": "^1.0.2",
  "langchain": "^0.x.x",
  "zod": "^3.x.x"
}
```

## 🎯 Key Benefits

1. **Better Prompts**: Reduced hallucination with explicit rules
2. **Streaming**: Real-time response display for better UX
3. **Tools**: Structured way to access tutor data
4. **Maintainability**: Clear separation of concerns
5. **Extensibility**: Easy to add more tools and features

## 🔍 Testing

To test the streaming functionality:

1. Start the dev server: `npm run dev`
2. Navigate to `/schedule`
3. Use the chat interface
4. Watch for real-time streaming responses

To test the agent with tools:

1. Import and use `createTutorMatchingAgent()`
2. Call `streamAgentResponse()` with a query
3. Verify tools are called correctly

## 📚 References

- [LangChain JS Documentation](https://js.langchain.com/)
- [LangChain Python Documentation](https://python.langchain.com/)
- Lesson notes: `LangChain_Part1.md`, `LangChain_Part2.md`

