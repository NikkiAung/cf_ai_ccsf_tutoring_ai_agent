// API route: POST /api/match
// AI-powered tutor matching using RAG (Retrieval-Augmented Generation)

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getAllTutors } from '@/lib/db';
import { matchTutor } from '@/lib/ai';
import type { MatchTutorRequest, MatchTutorResponse, ApiError } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as MatchTutorRequest;

    if (!body.skill) {
      return NextResponse.json<ApiError>(
        {
          error: 'Bad Request',
          message: 'Skill is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Get ALL tutors (RAG will do semantic search to find best matches)
    // This allows semantic understanding beyond simple keyword matching
    const allTutors = await getAllTutors(db);

    if (allTutors.length === 0) {
      return NextResponse.json<ApiError>(
        {
          error: 'Not Found',
          message: 'No tutors available',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Use RAG-based matching (semantic search + LLM reasoning)
    // This will:
    // 1. Generate embedding for user query
    // 2. Search Vectorize for similar tutors
    // 3. Use LLM to select best match from top candidates
    const match = await matchTutor(allTutors, body);

    if (!match) {
      return NextResponse.json<ApiError>(
        {
          error: 'Not Found',
          message: 'Could not match a tutor',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json<MatchTutorResponse>(match, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error matching tutor:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: 'Failed to match tutor',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

