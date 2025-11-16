// API route: POST /api/tutors/match-all
// Returns all tutors matching the criteria (not just the top match)

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getAllTutors, getMatchingTutors } from '@/lib/db';
import { searchSimilarTutors } from '@/lib/vectorize';
import type { MatchTutorRequest, MatchTutorResponse, ApiError, Tutor } from '@/types';

/**
 * Create a match response for a tutor
 */
function createMatchResponse(
  tutor: Tutor,
  request: MatchTutorRequest,
  score: number = 0.5,
  reasoning: string = 'Matched based on your requirements'
): MatchTutorResponse {
  // Filter availability based on request
  let availableSlots = tutor.availability;

  if (request.day) {
    availableSlots = availableSlots.filter(
      (a) => a.day.toLowerCase() === request.day!.toLowerCase()
    );
  }

  if (request.time) {
    availableSlots = availableSlots.filter((a) => a.time.includes(request.time!));
  }

  if (request.mode) {
    availableSlots = availableSlots.filter((a) => a.mode === request.mode);
  }

  return {
    tutor,
    matchScore: score,
    reasoning,
    availableSlots: availableSlots.length > 0 ? availableSlots : tutor.availability,
  };
}

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

    // Use semantic search to find all matching tutors
    try {
      const similarTutors = await searchSimilarTutors(
        body.skill,
        body.day,
        body.time,
        body.mode,
        20 // Get top 20 candidates (more than we need)
      );

      if (similarTutors.length === 0) {
        // Fall back to keyword matching
        console.log('Semantic search returned 0 results, falling back to keyword matching for skill:', body.skill);
        const matchingTutors = await getMatchingTutors(
          db,
          body.skill,
          body.day,
          body.time,
          body.mode
        );

        console.log('Keyword matching found tutors:', matchingTutors.length);

        const matches = matchingTutors.map((tutor) =>
          createMatchResponse(tutor, body, 0.5, 'Matched based on keyword search')
        );

        return NextResponse.json<MatchTutorResponse[]>(matches, { status: 200 });
      }

      // Get all matching tutors from semantic search results
      const matchingTutors = similarTutors
        .map((result) => allTutors.find((t) => t.id === result.tutorId))
        .filter((t): t is Tutor => t !== undefined);

      // Filter by additional criteria if provided
      let filteredTutors = matchingTutors;

      if (body.day) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.availability.some((a) => a.day.toLowerCase() === body.day!.toLowerCase())
        );
      }

      if (body.time) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.availability.some((a) => a.time.includes(body.time!))
        );
      }

      if (body.mode) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.availability.some((a) => a.mode === body.mode)
        );
      }

      // Create match responses for all tutors
      const matches = filteredTutors.map((tutor, index) => {
        const similarityResult = similarTutors.find((r) => r.tutorId === tutor.id);
        return createMatchResponse(
          tutor,
          body,
          similarityResult?.score || 0.5,
          `Matched based on ${similarityResult ? 'semantic similarity' : 'availability'}`
        );
      });

      // Sort by match score (highest first)
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return NextResponse.json<MatchTutorResponse[]>(matches, { status: 200 });
    } catch (error) {
      // Fall back to keyword matching if semantic search fails
      console.error('Semantic search failed, falling back to keyword matching:', error);
      const matchingTutors = await getMatchingTutors(
        db,
        body.skill,
        body.day,
        body.time,
        body.mode
      );

      const matches = matchingTutors.map((tutor) =>
        createMatchResponse(tutor, body, 0.5, 'Matched based on keyword search')
      );

      return NextResponse.json<MatchTutorResponse[]>(matches, { status: 200 });
    }
  } catch (error) {
    console.error('Error matching tutors:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to match tutors',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

