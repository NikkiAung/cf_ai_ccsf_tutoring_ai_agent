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

    console.log('🔍 [match-all] Received request:', JSON.stringify(body, null, 2));

    if (!body.skill) {
      console.warn('⚠️ [match-all] No skill provided');
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

    console.log(`📚 [match-all] Total tutors in database: ${allTutors.length}`);

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
      console.log(`🔎 [match-all] Searching for skill: "${body.skill}"`);
      const similarTutors = await searchSimilarTutors(
        body.skill,
        body.day,
        body.time,
        body.mode,
        20 // Get top 20 candidates (more than we need)
      );

      console.log(`✅ [match-all] Semantic search found ${similarTutors.length} similar tutors`);

      if (similarTutors.length === 0) {
        // Fall back to keyword matching
        console.log('⚠️ [match-all] Semantic search returned 0 results, falling back to keyword matching for skill:', body.skill);
        const matchingTutors = await getMatchingTutors(
          db,
          body.skill,
          body.day,
          body.time,
          body.mode
        );

        console.log(`✅ [match-all] Keyword matching found ${matchingTutors.length} tutors`);

        if (matchingTutors.length === 0) {
          // If keyword matching also fails, try without day/time/mode filters (just skill)
          console.log('⚠️ [match-all] Keyword matching with filters returned 0 results, trying skill-only search');
          const skillOnlyTutors = await getMatchingTutors(
            db,
            body.skill,
            undefined, // No day filter
            undefined, // No time filter
            undefined  // No mode filter
          );
          
          console.log(`✅ [match-all] Skill-only search found ${skillOnlyTutors.length} tutors`);
          
          const matches = skillOnlyTutors.map((tutor) =>
            createMatchResponse(tutor, body, 0.5, 'Matched based on skill')
          );

          return NextResponse.json<MatchTutorResponse[]>(matches, { status: 200 });
        }

        const matches = matchingTutors.map((tutor) =>
          createMatchResponse(tutor, body, 0.5, 'Matched based on keyword search')
        );

        return NextResponse.json<MatchTutorResponse[]>(matches, { status: 200 });
      }

      // Get all matching tutors from semantic search results
      const matchingTutors = similarTutors
        .map((result) => allTutors.find((t) => t.id === result.tutorId))
        .filter((t): t is Tutor => t !== undefined);

      console.log(`📋 [match-all] Found ${matchingTutors.length} tutors from semantic search results`);
      console.log(`📋 [match-all] Tutor IDs from semantic search:`, similarTutors.map(r => r.tutorId));
      console.log(`📋 [match-all] Tutor names from semantic search:`, matchingTutors.map(t => t.name));

      // IMPORTANT: Also do a keyword-based search to ensure we don't miss any tutors
      // This is a fallback to catch tutors that semantic search might miss
      const keywordMatchingTutors = await getMatchingTutors(
        db,
        body.skill,
        undefined, // No day filter for keyword search
        undefined, // No time filter for keyword search
        undefined  // No mode filter for keyword search
      );

      console.log(`🔍 [match-all] Keyword search found ${keywordMatchingTutors.length} tutors for skill: "${body.skill}"`);
      console.log(`🔍 [match-all] Keyword search tutor names:`, keywordMatchingTutors.map(t => t.name));

      // Combine semantic and keyword results, removing duplicates
      const allMatchingTutors = new Map<number, Tutor>();
      
      // Add semantic search results
      matchingTutors.forEach(tutor => {
        allMatchingTutors.set(tutor.id, tutor);
      });
      
      // Add keyword search results (will overwrite duplicates, keeping semantic results)
      keywordMatchingTutors.forEach(tutor => {
        if (!allMatchingTutors.has(tutor.id)) {
          allMatchingTutors.set(tutor.id, tutor);
        }
      });

      const combinedTutors = Array.from(allMatchingTutors.values());
      console.log(`✅ [match-all] Combined search found ${combinedTutors.length} unique tutors`);

      // Filter by additional criteria if provided (but be lenient - don't filter too strictly)
      let filteredTutors = combinedTutors;
      const beforeDayFilter = filteredTutors.length;

      if (body.day) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.availability.some((a) => a.day.toLowerCase() === body.day!.toLowerCase())
        );
        console.log(`📅 [match-all] After day filter (${body.day}): ${beforeDayFilter} → ${filteredTutors.length}`);
      }

      const beforeTimeFilter = filteredTutors.length;
      if (body.time) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.availability.some((a) => a.time.includes(body.time!))
        );
        console.log(`⏰ [match-all] After time filter (${body.time}): ${beforeTimeFilter} → ${filteredTutors.length}`);
      }

      const beforeModeFilter = filteredTutors.length;
      if (body.mode) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.availability.some((a) => a.mode === body.mode)
        );
        console.log(`💻 [match-all] After mode filter (${body.mode}): ${beforeModeFilter} → ${filteredTutors.length}`);
      }

      // If filtering removed all tutors, return the unfiltered results (prioritize skill match over day/time/mode)
      if (filteredTutors.length === 0 && combinedTutors.length > 0) {
        console.log('⚠️ [match-all] All tutors filtered out by day/time/mode, returning skill-matched tutors without strict filters');
        filteredTutors = combinedTutors;
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

      console.log(`✅ [match-all] Returning ${matches.length} matches`);
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

