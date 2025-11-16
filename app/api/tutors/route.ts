// API route: GET /api/tutors
// Returns all tutors with their skills and availability

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getAllTutors } from '@/lib/db';
import type { Tutor, ApiError } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    const tutors = await getAllTutors(db);

    return NextResponse.json<Tutor[]>(tutors, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch tutors',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

