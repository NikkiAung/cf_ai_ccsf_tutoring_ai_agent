// API route: GET /api/availability
// Returns full schedule with all tutors and their availability

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getAvailabilityByTutor } from '@/lib/db';
import type { ApiError } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    const availability = await getAvailabilityByTutor(db);

    return NextResponse.json(availability, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch availability',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

