// LangChain agent for tutor matching and chat
// Implements: Streaming, High-quality prompts, Tools, Memory

// NOTE: This file provides an advanced agent implementation with tools.
// It requires additional LangChain packages that may not be available.
// For basic streaming, use lib/langchain-simple.ts instead.

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Try to import agent functionality (may not be available in all LangChain versions)
let AgentExecutor: any;
let createOpenAIFunctionsAgent: any;

try {
  // Try different possible import paths
  const agentsModule = require('langchain/agents');
  AgentExecutor = agentsModule.AgentExecutor;
  createOpenAIFunctionsAgent = agentsModule.createOpenAIFunctionsAgent;
} catch (e) {
  console.warn('LangChain agents module not available. Full agent features disabled.');
  console.warn('Install langchain package: npm install langchain');
}
import { config } from '@/config';
import type { Tutor, MatchTutorRequest, MatchTutorResponse } from '@/types';
import { searchSimilarTutors } from './vectorize';
import { getAllTutors } from './db';
import { getDatabase } from './mockDb';

// High-quality SYSTEM_PROMPT to prevent hallucination (Lesson 1)
const SYSTEM_PROMPT = `You are a helpful AI scheduling assistant for the CCSF CS Tutor Squad.

Your role is to help students find and book tutoring sessions with qualified tutors.

CRITICAL RULES:
1. **NEVER make up tutor names, skills, or availability** - Only use information from the tools
2. **NEVER invent course codes or class names** - Only use real CCSF course codes
3. **ALWAYS verify tutor information** - Use the search_tutors tool before recommending anyone
4. **Be accurate and specific** - If you don't have information, say so clearly
5. **Think step-by-step** - Consider all requirements (skill, day, time, mode) before matching
6. **Provide clear reasoning** - Explain why a tutor is a good match based on actual data

When a student asks for help:
1. First, understand their needs (programming language, topic, preferred time)
2. Use search_tutors tool to find matching tutors
3. Present the best match with specific reasons
4. Offer to show more options if available
5. Guide them through booking if they want to proceed

If you cannot find a match, be honest and suggest:
- Trying different search terms
- Checking availability for different days/times
- Contacting the tutor coordinator

Remember: Accuracy and honesty are more important than always having an answer.`;

// Tool: Search for tutors (Lesson 4 - Tools with detailed descriptions)
const searchTutorsTool = new DynamicStructuredTool({
  name: 'search_tutors',
  description: `Search for tutors matching specific criteria. Use this tool whenever a student asks for help with a programming language or topic.

Args:
  skill (string | string[]): The programming language or topic (e.g., "Python", "Java", "JavaScript", "React", "Data Structures")
  day (string, optional): Preferred day (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
  time (string, optional): Preferred time (e.g., "10:00", "14:30")
  mode (string, optional): Preferred mode ("online" or "on campus")

Returns:
  Array of matching tutors with their details, skills, and availability.

IMPORTANT: Always use this tool before recommending a tutor. Never make up tutor information.`,
  schema: z.object({
    skill: z.union([z.string(), z.array(z.string())]).describe('Programming language or topic'),
    day: z.string().optional().describe('Preferred day of week'),
    time: z.string().optional().describe('Preferred time'),
    mode: z.enum(['online', 'on campus']).optional().describe('Preferred mode'),
  }),
  func: async ({ skill, day, time, mode }) => {
    try {
      const db = getDatabase();
      const allTutors = await getAllTutors(db);
      
      // Use RAG semantic search
      const similarTutors = await searchSimilarTutors(
        skill,
        day,
        time,
        mode,
        10 // Get top 10 for better selection
      );

      if (similarTutors.length === 0) {
        return JSON.stringify({ tutors: [], message: 'No tutors found matching your criteria' });
      }

      // Get full tutor details
      const matchedTutors = similarTutors
        .map(result => {
          const tutor = allTutors.find(t => t.id === result.tutorId);
          if (!tutor) return null;
          
          // Filter availability based on preferences
          let availableSlots = tutor.availability;
          if (day) {
            availableSlots = availableSlots.filter(
              a => a.day.toLowerCase() === day.toLowerCase()
            );
          }
          if (time) {
            availableSlots = availableSlots.filter(a => a.time.includes(time));
          }
          if (mode) {
            availableSlots = availableSlots.filter(a => a.mode === mode);
          }

          return {
            id: tutor.id,
            name: tutor.name,
            pronouns: tutor.pronouns,
            skills: tutor.skills,
            mode: tutor.mode,
            bio: tutor.bio,
            similarityScore: result.score,
            availableSlots: availableSlots.length > 0 ? availableSlots : tutor.availability,
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      return JSON.stringify({
        tutors: matchedTutors,
        count: matchedTutors.length,
      });
    } catch (error) {
      console.error('Error in search_tutors tool:', error);
      return JSON.stringify({ 
        tutors: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },
});

// Tool: Get all available tutors (for "show me other tutors")
const getAllAvailableTutorsTool = new DynamicStructuredTool({
  name: 'get_all_available_tutors',
  description: `Get all tutors matching search criteria. Use this when a student asks to see "other tutors" or "more options".

Args:
  skill (string | string[]): The programming language or topic
  day (string, optional): Preferred day
  time (string, optional): Preferred time
  mode (string, optional): Preferred mode

Returns:
  Array of all matching tutors (not just the top match).

Use this tool when the student wants to see multiple tutor options.`,
  schema: z.object({
    skill: z.union([z.string(), z.array(z.string())]),
    day: z.string().optional(),
    time: z.string().optional(),
    mode: z.enum(['online', 'on campus']).optional(),
  }),
  func: async ({ skill, day, time, mode }) => {
    try {
      const db = getDatabase();
      const allTutors = await getAllTutors(db);
      
      const similarTutors = await searchSimilarTutors(skill, day, time, mode, 20);

      const matchedTutors = similarTutors
        .map(result => {
          const tutor = allTutors.find(t => t.id === result.tutorId);
          if (!tutor) return null;

          let availableSlots = tutor.availability;
          if (day) {
            availableSlots = availableSlots.filter(
              a => a.day.toLowerCase() === day.toLowerCase()
            );
          }
          if (time) {
            availableSlots = availableSlots.filter(a => a.time.includes(time));
          }
          if (mode) {
            availableSlots = availableSlots.filter(a => a.mode === mode);
          }

          return {
            id: tutor.id,
            name: tutor.name,
            skills: tutor.skills,
            mode: tutor.mode,
            similarityScore: result.score,
            availableSlots: availableSlots.length > 0 ? availableSlots : tutor.availability,
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

      return JSON.stringify({
        tutors: matchedTutors,
        count: matchedTutors.length,
      });
    } catch (error) {
      return JSON.stringify({ 
        tutors: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },
});

/**
 * Create LangChain agent with tools and memory
 * NOTE: Requires langchain package to be installed
 */
export function createTutorMatchingAgent() {
  if (!AgentExecutor || !createOpenAIFunctionsAgent) {
    throw new Error(
      'LangChain agents module not available. Install langchain package: npm install langchain'
    );
  }

  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required for LangChain agent');
  }

  // Initialize LLM with streaming support
  const llm = new ChatOpenAI({
    modelName: config.openai.model,
    temperature: config.openai.temperature,
    openAIApiKey: config.openai.apiKey,
    streaming: true, // Enable streaming (Lesson 3)
  });

  // Create prompt template with system prompt
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  // Create agent with tools
  const agent = createOpenAIFunctionsAgent({
    llm,
    tools: [searchTutorsTool, getAllAvailableTutorsTool],
    prompt,
  });

  // Create executor
  const executor = new AgentExecutor({
    agent,
    tools: [searchTutorsTool, getAllAvailableTutorsTool],
    verbose: process.env.NODE_ENV === 'development',
    maxIterations: 5,
  });

  return executor;
}

/**
 * Stream agent response (Lesson 3 - Streaming mode)
 */
export async function* streamAgentResponse(
  agent: any, // AgentExecutor type
  input: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  // Convert chat history to LangChain format
  const history = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'human' : 'assistant',
    content: msg.content,
  }));

  // Stream the response
  const stream = await agent.stream({
    input,
    chat_history: history,
  });

  let fullResponse = '';
  
  for await (const chunk of stream) {
    // Extract text from chunk
    if (chunk.agent?.messages?.[0]?.content) {
      const content = chunk.agent.messages[0].content;
      fullResponse += content;
      yield content;
    } else if (chunk.tool?.messages?.[0]?.content) {
      // Tool execution - could yield tool status if needed
      yield '';
    }
  }

  return fullResponse;
}

/**
 * Invoke agent without streaming (for non-streaming use cases)
 */
export async function invokeAgent(
  agent: any, // AgentExecutor type
  input: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  const history = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'human' : 'assistant',
    content: msg.content,
  }));

  const result = await agent.invoke({
    input,
    chat_history: history,
  });

  return result.output;
}

