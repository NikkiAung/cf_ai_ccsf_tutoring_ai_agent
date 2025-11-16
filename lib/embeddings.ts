// Embedding generation for RAG (Retrieval-Augmented Generation)
// Supports both Cloudflare Workers AI and OpenAI embeddings

import type { Tutor } from '@/types';

/**
 * Generate embedding for text using OpenAI or Workers AI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Get API key directly from environment (config might be cached at import time)
  const apiKey = process.env.OPENAI_API_KEY || '';
  
  // Try OpenAI embeddings first (more reliable)
  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small', // Cost-effective, good quality
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI embeddings error: ${response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      return data.data[0].embedding;
    } catch (error) {
      console.warn('OpenAI embeddings failed, trying Workers AI:', error);
    }
  }

  // Fallback to Cloudflare Workers AI (if available)
  // Note: This requires Workers AI binding in production
  try {
    // In development, we'll use a mock or OpenAI
    // In production with Workers, this would be:
    // const ai = env.AI; // Workers AI binding
    // const embedding = await ai.run('@cf/baai/bge-base-en-v1.5', { text });
    
    // For now, throw error if OpenAI also failed
    throw new Error('No embedding service available');
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embedding for a tutor (combines bio, skills, availability)
 */
export async function generateTutorEmbedding(tutor: Tutor): Promise<number[]> {
  // Create a comprehensive text representation of the tutor
  const tutorText = `
Tutor: ${tutor.name}
${tutor.pronouns ? `Pronouns: ${tutor.pronouns}` : ''}
Bio: ${tutor.bio}
Skills: ${tutor.skills.join(', ')}
Mode: ${tutor.mode}
Availability: ${tutor.availability.map(a => `${a.day} ${a.time} (${a.mode})`).join(', ')}
  `.trim();

  return generateEmbedding(tutorText);
}

/**
 * Generate embedding for a user query
 */
export async function generateQueryEmbedding(
  skill: string | string[],
  day?: string,
  time?: string,
  mode?: string
): Promise<number[]> {
  const skills = Array.isArray(skill) ? skill.join(', ') : skill;
  
  const queryText = `
Student needs help with: ${skills}
${day ? `Preferred day: ${day}` : ''}
${time ? `Preferred time: ${time}` : ''}
${mode ? `Preferred mode: ${mode}` : ''}
  `.trim();

  return generateEmbedding(queryText);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

