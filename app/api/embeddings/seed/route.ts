// API route: POST /api/embeddings/seed
// Generate and store embeddings for all tutors in Vectorize

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getAllTutors } from '@/lib/db';
import { storeTutorEmbeddings } from '@/lib/vectorize';
import type { ApiError } from '@/types';

export async function POST() {
  try {
    const db = getDatabase();
    const tutors = await getAllTutors(db);

    if (tutors.length === 0) {
      return NextResponse.json<ApiError>(
        {
          error: 'Not Found',
          message: 'No tutors found in database',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Generate and store embeddings
    await storeTutorEmbeddings(tutors);

    return NextResponse.json({
      success: true,
      message: `Successfully generated and stored embeddings for ${tutors.length} tutors`,
      count: tutors.length,
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error seeding embeddings:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: `Failed to seed embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

