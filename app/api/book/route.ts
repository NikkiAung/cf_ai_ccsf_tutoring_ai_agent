// API route: POST /api/book
// Prepares booking information and optionally automates Calendly booking

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mockDb';
import { getTutorById } from '@/lib/db';
import { automateCalendlyBooking } from '@/lib/calendly-automation';
import { generateCalendlyUrlWithParams } from '@/lib/calendly-api';
import type { BookSessionRequest, BookSessionResponse, ApiError } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as BookSessionRequest & { automate?: boolean };

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

    const db = getDatabase();
    const tutor = await getTutorById(db, body.tutorId);

    if (!tutor) {
      return NextResponse.json<ApiError>(
        {
          error: 'Not Found',
          message: `Tutor with ID ${body.tutorId} not found`,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Verify the requested slot exists
    const slot = tutor.availability.find(
      (a) => a.day === body.day && a.time === body.time
    );

    if (!slot) {
      return NextResponse.json<ApiError>(
        {
          error: 'Bad Request',
          message: 'Requested time slot is not available',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // If automation is requested, run it
    if (body.automate) {
      try {
        const automationResult = await automateCalendlyBooking(body);
        
        const response: BookSessionResponse = {
          success: automationResult.success,
          calendlyUrl: automationResult.calendlyUrl,
          automationStatus: automationResult.success ? 'completed' : 'failed',
          message: automationResult.message,
          sessionDetails: {
            tutor: tutor.name,
            day: body.day,
            time: body.time,
            mode: slot.mode,
          },
        };

        return NextResponse.json<BookSessionResponse>(response, {
          status: automationResult.success ? 200 : 200, // Always return 200, success flag indicates status
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Automation error in API route:', error);
        
        // Return error response but don't fail completely
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const targetDate = new Date();
        const calendlyUrl = generateCalendlyUrlWithParams(body);
        
        return NextResponse.json<BookSessionResponse>({
          success: false,
          calendlyUrl,
          automationStatus: 'failed',
          message: `Automation failed: ${errorMessage}. Please use the link below to book manually.`,
          sessionDetails: {
            tutor: tutor.name,
            day: body.day,
            time: body.time,
            mode: slot.mode,
          },
        }, {
          status: 200, // Return 200 so frontend can show the error message
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }

    // Otherwise, just return the booking URL
    // Generate Calendly URL with proper date format
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = days.findIndex(d => d.toLowerCase() === body.day.toLowerCase());
    const now = new Date();
    const currentDay = now.getDay();
    let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
    
    if (daysUntilTarget === 0) {
      const [hours] = body.time.split('-')[0].split(':').map(Number);
      const targetTime = new Date(now);
      targetTime.setHours(hours, 0, 0, 0);
      if (targetTime < now) {
        daysUntilTarget = 7;
      }
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);
    const [hours, minutes] = body.time.split('-')[0].split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-08:00`;
    
    const calendlyUrl = `https://calendly.com/cs-tutor-squad/30min/${dateStr}?back=1&month=${year}-${month}&date=${year}-${month}-${day}`;

    const response: BookSessionResponse = {
      success: true,
      calendlyUrl,
      automationStatus: 'pending',
      sessionDetails: {
        tutor: tutor.name,
        day: body.day,
        time: body.time,
        mode: slot.mode,
      },
    };

    return NextResponse.json<BookSessionResponse>(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error booking session:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: 'Failed to book session',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

