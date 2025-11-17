// LangChain Structured Outputs implementation (Lesson 7)
// Provides type-safe structured responses using Zod schemas

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { config } from '@/config';
import type { AvailabilitySlot } from '@/types';

/**
 * Structured output schema for tutor matching (Lesson 7)
 * Using Zod schema (TypeScript equivalent of Pydantic BaseModel)
 */
export const TutorMatchSchema = z.object({
  tutorName: z.string().describe('The exact name of the matched tutor'),
  reasoning: z.string().describe('Brief explanation (1-2 sentences) why this tutor is the best match'),
  availableSlots: z.array(
    z.object({
      day: z.string().describe('Day of the week (e.g., Monday, Tuesday)'),
      time: z.string().describe('Time slot (e.g., 9:30-10:00)'),
      mode: z.enum(['online', 'on campus']).describe('Session mode'),
    })
  ).describe('Available time slots that match student preferences'),
});

export type TutorMatchOutput = z.infer<typeof TutorMatchSchema>;

/**
 * Structured output schema for general chat responses
 */
export const ChatResponseSchema = z.object({
  response: z.string().describe('The assistant\'s response to the user'),
  intent: z.enum(['tutor_search', 'booking', 'general', 'other']).describe('The intent of the user\'s message'),
  requiresAction: z.boolean().describe('Whether the response requires user action'),
});

export type ChatResponseOutput = z.infer<typeof ChatResponseSchema>;

/**
 * Create LLM with structured output support (Lesson 7)
 * Uses OpenAI's structured outputs feature
 */
export function createStructuredLLM<T extends z.ZodTypeAny>(
  schema: T,
  streaming: boolean = false
) {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const llm = new ChatOpenAI({
    modelName: config.openai.model,
    temperature: config.openai.temperature,
    openAIApiKey: config.openai.apiKey,
    streaming,
  });

  // Bind structured output schema using withStructuredOutput
  // This ensures the LLM returns data matching the Zod schema
  const structuredLLM = llm.withStructuredOutput(schema, {
    name: 'structured_output',
    method: 'function_calling', // Use function calling for structured outputs
  });

  return structuredLLM;
}

/**
 * Get structured tutor match response
 */
export async function getStructuredTutorMatch(
  prompt: string,
  candidateTutors: Array<{
    name: string;
    skills: string[];
    mode: string;
    bio: string;
    availability: AvailabilitySlot[];
  }>
): Promise<TutorMatchOutput> {
  const llm = createStructuredLLM(TutorMatchSchema, false);

  const systemPrompt = `You are a careful AI assistant helping match students with tutors for the CCSF CS Tutor Squad.

CRITICAL RULES:
- Think step-by-step before selecting a tutor
- NEVER make up tutor names, skills, or availability - only use the data provided below
- ALWAYS base your reasoning on actual tutor data
- Be specific and accurate in your recommendations
- Return the tutor's EXACT name as shown in the candidate list

Candidate Tutors:
${candidateTutors.map((tutor, idx) => `
${idx + 1}. ${tutor.name}
   - Skills: ${tutor.skills.join(', ')}
   - Mode: ${tutor.mode}
   - Bio: ${tutor.bio}
   - Available: ${tutor.availability.map(a => `${a.day} ${a.time} (${a.mode})`).join(', ')}
`).join('\n')}

Student Request: ${prompt}

Please select the best matching tutor and provide reasoning based on the actual data above.`;

  const response = await llm.invoke(systemPrompt);
  return response as TutorMatchOutput;
}

/**
 * Get structured chat response
 */
export async function getStructuredChatResponse(
  input: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatResponseOutput> {
  const llm = createStructuredLLM(ChatResponseSchema, false);

  const history = chatHistory.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n');

  const prompt = `You are a helpful AI scheduling assistant for the CCSF CS Tutor Squad.

Previous conversation:
${history || '(No previous conversation)'}

Current user message: ${input}

Analyze the user's intent and provide a structured response.`;

  const response = await llm.invoke(prompt);
  return response as ChatResponseOutput;
}

