// API route: GET /api/tutors/:id
// Returns a single tutor by ID with skills and availability

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getTutorById } from '@/lib/db';
import type { Tutor, ApiError } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = parseInt(id, 10);

    if (isNaN(tutorId)) {
      return NextResponse.json<ApiError>(
        {
          error: 'Bad Request',
          message: 'Invalid tutor ID',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const tutor = await getTutorById(db, tutorId);

    if (!tutor) {
      return NextResponse.json<ApiError>(
        {
          error: 'Not Found',
          message: `Tutor with ID ${tutorId} not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json<Tutor>(tutor, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching tutor:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch tutor',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

