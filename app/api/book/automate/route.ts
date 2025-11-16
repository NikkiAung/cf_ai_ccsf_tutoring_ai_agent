// API route: POST /api/book/automate
// Automates Calendly booking using Puppeteer

import { NextResponse } from 'next/server';
import { automateCalendlyBooking } from '@/lib/calendly-automation';
import type { BookSessionRequest, ApiError } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as BookSessionRequest;

    // Validate required fields
    if (!body.tutorId || !body.day || !body.time || !body.studentName || !body.studentEmail || !body.ccsfEmail) {
      return NextResponse.json<ApiError>(
        {
          error: 'Bad Request',
          message: 'Missing required fields: tutorId, day, time, studentName, studentEmail, ccsfEmail',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Run automation
    const result = await automateCalendlyBooking(body);

    return NextResponse.json({
      success: result.success,
      calendlyUrl: result.calendlyUrl,
      automationStatus: result.success ? 'completed' : 'failed',
      message: result.message,
    }, {
      status: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error automating booking:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: 'Failed to automate booking',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

