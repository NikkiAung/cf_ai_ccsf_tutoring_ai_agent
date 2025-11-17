// API route for streaming chat responses using LangChain
// Implements streaming mode (Lesson 3)

import { NextResponse } from 'next/server';
import { streamChatResponse } from '@/lib/langchain-simple';
import type { ApiError } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      message: string;
      chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!body.message) {
      return NextResponse.json<ApiError>(
        {
          error: 'Bad Request',
          message: 'Message is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<ApiError>(
        {
          error: 'Configuration Error',
          message: 'OPENAI_API_KEY is not configured',
          statusCode: 500,
        },
        { status: 500 }
      );
    }

    // Create a readable stream for SSE (Server-Sent Events)
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream chat response using LangChain
          for await (const chunk of streamChatResponse(
            body.message,
            body.chatHistory || []
          )) {
            if (chunk) {
              // Send chunk as SSE
              const data = JSON.stringify({ content: chunk, done: false });
              controller.enqueue(`data: ${data}\n\n`);
            }
          }

          // Send completion
          const done = JSON.stringify({ content: '', done: true });
          controller.enqueue(`data: ${done}\n\n`);
          controller.close();
        } catch (error) {
          console.error('Error streaming response:', error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            done: true,
          });
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat stream:', error);
    return NextResponse.json<ApiError>(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to process chat',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

