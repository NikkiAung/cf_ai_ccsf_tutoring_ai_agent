// Simplified LangChain integration for tutor matching
// Implements: High-quality prompts, Tools, Streaming support, Memory (Lesson 6)

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { config } from '@/config';
import type { MatchTutorRequest } from '@/types';
import { createConversationMemory, type ConversationMemory } from './langchain-memory';

// High-quality SYSTEM_PROMPT to prevent hallucination (Lesson 1)
const SYSTEM_PROMPT = `You are a helpful AI scheduling assistant for the CCSF CS Tutor Squad.

Your role is to help students find and book tutoring sessions with qualified tutors.

CRITICAL RULES:
1. **NEVER make up tutor names, skills, or availability** - Only use information provided to you
2. **NEVER invent course codes or class names** - Only use real CCSF course codes
3. **ALWAYS be accurate and specific** - If you don't have information, say so clearly
4. **Think step-by-step** - Consider all requirements (skill, day, time, mode) before responding
5. **Provide clear reasoning** - Explain your recommendations based on actual data

When responding to students:
- Be friendly and helpful
- Provide specific examples when possible
- Guide them through the booking process
- If you cannot help, suggest alternatives

Remember: Accuracy and honesty are more important than always having an answer.`;

/**
 * Create a LangChain chat model with streaming support
 */
export function createChatModel(streaming: boolean = true) {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  return new ChatOpenAI({
    modelName: config.openai.model,
    temperature: config.openai.temperature,
    openAIApiKey: config.openai.apiKey,
    streaming,
  });
}

/**
 * Create a prompt template for chat responses
 */
export function createChatPrompt() {
  return ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
  ]);
}

/**
 * Stream chat response with memory (Lesson 3 - Streaming mode, Lesson 6 - Memory)
 */
export async function* streamChatResponse(
  input: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  sessionId?: string
) {
  const llm = createChatModel(true);
  const prompt = createChatPrompt();

  // Convert chat history to LangChain format
  const history = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'human' : 'assistant',
    content: msg.content,
  }));

  // Create chain
  const chain = prompt.pipe(llm);

  // Use memory if sessionId is provided (Lesson 6)
  let config: any = {};
  if (sessionId) {
    const memory = createConversationMemory(sessionId);
    config = memory.getConfig();
  }

  // Stream the response
  const stream = await chain.stream({
    input,
    chat_history: history,
    ...config,
  });

  let fullResponse = '';
  
  for await (const chunk of stream) {
    if (chunk.content) {
      fullResponse += chunk.content;
      yield chunk.content;
    }
  }

  // Save to memory if sessionId is provided
  if (sessionId) {
    const memory = createConversationMemory(sessionId);
    const updatedHistory = [
      ...history,
      { role: 'human' as const, content: input },
      { role: 'assistant' as const, content: fullResponse },
    ];
    // Note: Memory saving would need to be implemented with LangGraph
    // For now, we rely on Durable Objects for persistence
  }

  return fullResponse;
}

/**
 * Get non-streaming chat response with memory (Lesson 6 - Memory)
 */
export async function getChatResponse(
  input: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  sessionId?: string
): Promise<string> {
  const llm = createChatModel(false);
  const prompt = createChatPrompt();

  const history = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'human' : 'assistant',
    content: msg.content,
  }));

  // Use memory if sessionId is provided (Lesson 6)
  let config: any = {};
  if (sessionId) {
    const memory = createConversationMemory(sessionId);
    config = memory.getConfig();
  }

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({
    input,
    chat_history: history,
    ...config,
  });

  return response.content as string;
}

