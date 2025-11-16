// Cloudflare Vectorize integration for RAG
// Stores and searches tutor embeddings

import type { Tutor } from '@/types';
import { generateTutorEmbedding, generateQueryEmbedding, cosineSimilarity } from './embeddings';

// Vectorize interface (matches Cloudflare Vectorize API)
export interface VectorizeIndex {
  query(
    vector: number[],
    options?: {
      topK?: number;
      returnValues?: boolean;
      returnMetadata?: boolean;
      filter?: Record<string, unknown>;
    }
  ): Promise<{
    matches: Array<{
      id: string;
      score: number;
      values?: number[];
      metadata?: Record<string, unknown>;
    }>;
  }>;
  
  upsert(vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, unknown>;
  }>): Promise<{ count: number }>;
  
  getByIds(ids: string[]): Promise<Array<{
    id: string;
    values?: number[];
    metadata?: Record<string, unknown>;
  }>>;
  
  deleteByIds(ids: string[]): Promise<{ count: number }>;
}

// Mock Vectorize for development (stores in memory)
class MockVectorizeIndex implements VectorizeIndex {
  private vectors: Map<string, { values: number[]; metadata: Record<string, unknown> }> = new Map();

  async query(
    vector: number[],
    options?: {
      topK?: number;
      returnValues?: boolean;
      returnMetadata?: boolean;
      filter?: Record<string, unknown>;
    }
  ): Promise<{
    matches: Array<{
      id: string;
      score: number;
      values?: number[];
      metadata?: Record<string, unknown>;
    }>;
  }> {
    const topK = options?.topK || 10;
    const matches: Array<{ id: string; score: number; values?: number[]; metadata?: Record<string, unknown> }> = [];

    for (const [id, data] of this.vectors.entries()) {
      const score = cosineSimilarity(vector, data.values);
      matches.push({
        id,
        score,
        values: options?.returnValues ? data.values : undefined,
        metadata: options?.returnMetadata ? data.metadata : undefined,
      });
    }

    // Sort by score (highest first) and return top K
    matches.sort((a, b) => b.score - a.score);
    return { matches: matches.slice(0, topK) };
  }

  async upsert(vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, unknown>;
  }>): Promise<{ count: number }> {
    for (const vector of vectors) {
      this.vectors.set(vector.id, {
        values: vector.values,
        metadata: vector.metadata || {},
      });
    }
    return { count: vectors.length };
  }

  async getByIds(ids: string[]): Promise<Array<{
    id: string;
    values?: number[];
    metadata?: Record<string, unknown>;
  }>> {
    return ids
      .map(id => {
        const data = this.vectors.get(id);
        if (!data) return null;
        return {
          id,
          values: data.values,
          metadata: data.metadata,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async deleteByIds(ids: string[]): Promise<{ count: number }> {
    let count = 0;
    for (const id of ids) {
      if (this.vectors.delete(id)) {
        count++;
      }
    }
    return { count };
  }
}

/**
 * Get Vectorize index instance
 * In production, this would use the actual Cloudflare Vectorize binding
 */
export function getVectorizeIndex(): VectorizeIndex {
  // In development, use mock
  // In production with Cloudflare Workers, this would be:
  // return env.VECTORIZE_INDEX; // Vectorize binding from wrangler.toml
  
  // For now, return mock (will be replaced in production)
  if (typeof globalThis.vectorizeIndex === 'undefined') {
    globalThis.vectorizeIndex = new MockVectorizeIndex();
  }
  return globalThis.vectorizeIndex;
}

// Extend global to store mock index (for development)
declare global {
  // eslint-disable-next-line no-var
  var vectorizeIndex: VectorizeIndex | undefined;
}

/**
 * Store tutor embeddings in Vectorize
 */
export async function storeTutorEmbeddings(tutors: Tutor[]): Promise<void> {
  const index = getVectorizeIndex();
  
  const vectors = await Promise.all(
    tutors.map(async (tutor) => {
      const embedding = await generateTutorEmbedding(tutor);
      return {
        id: `tutor-${tutor.id}`,
        values: embedding,
        metadata: {
          tutorId: tutor.id,
          name: tutor.name,
          skills: tutor.skills,
          mode: tutor.mode,
        },
      };
    })
  );

  await index.upsert(vectors);
  console.log(`Stored ${vectors.length} tutor embeddings in Vectorize`);
}

/**
 * Search for similar tutors using semantic search
 */
export async function searchSimilarTutors(
  skill: string | string[],
  day?: string,
  time?: string,
  mode?: string,
  topK: number = 5
): Promise<Array<{ tutorId: number; score: number }>> {
  const index = getVectorizeIndex();
  
  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(skill, day, time, mode);
  
  // Search Vectorize
  const results = await index.query(queryEmbedding, {
    topK,
    returnMetadata: true,
  });

  // Extract tutor IDs and scores
  return results.matches
    .map(match => ({
      tutorId: parseInt((match.metadata?.tutorId as string) || '0'),
      score: match.score,
    }))
    .filter(result => result.tutorId > 0);
}

