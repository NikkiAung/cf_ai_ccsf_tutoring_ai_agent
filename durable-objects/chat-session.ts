// Durable Object for managing chat session state
// Provides persistent chat state across page refreshes and coordinates between requests
// Reference: https://developers.cloudflare.com/durable-objects/

import type { Message, MatchTutorResponse, MatchTutorRequest } from '@/types';

export interface BookingInfo {
  studentName: string;
  studentEmail: string;
  ccsfEmail: string;
  studentId?: string;
  allowOtherStudents?: boolean;
  classes?: string[];
  specificHelp?: string;
  additionalNotes?: string;
  slot: { day: string; time: string; mode: string };
  step: 'name-email' | 'ccsf-email' | 'student-id' | 'allow-others' | 'classes' | 'specific-help' | 'additional-notes' | 'complete';
}

export interface ChatSessionState {
  messages: Message[];
  pendingMatch: MatchTutorResponse | null;
  lastSearchCriteria: MatchTutorRequest | null;
  availableTutorsList: MatchTutorResponse[];
  bookingInfo: BookingInfo | null;
  createdAt: number;
  lastAccessedAt: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tutorMatch?: MatchTutorResponse;
  timestamp?: number;
}

/**
 * Durable Object class for managing chat session state
 * Each chat session has a unique ID and persists state across requests
 */
export class ChatSession {
  state: DurableObjectState;
  env: Env;

  // In-memory state (fast access)
  private chatState: ChatSessionState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Load state from storage if not already loaded
      if (!this.chatState) {
        await this.loadState();
      }

      // Update last accessed timestamp
      if (this.chatState) {
        this.chatState.lastAccessedAt = Date.now();
      }

      // Route requests
      switch (path) {
        case '/messages':
          if (request.method === 'GET') {
            return this.getMessages();
          } else if (request.method === 'POST') {
            const body = await request.json() as ChatMessage;
            return this.addMessage(body);
          }
          break;

        case '/state':
          if (request.method === 'GET') {
            return this.getState();
          } else if (request.method === 'PUT') {
            const body = await request.json() as Partial<ChatSessionState>;
            return this.updateState(body);
          }
          break;

        case '/pending-match':
          if (request.method === 'GET') {
            return this.getPendingMatch();
          } else if (request.method === 'PUT') {
            const body = await request.json() as MatchTutorResponse | null;
            return this.setPendingMatch(body);
          } else if (request.method === 'DELETE') {
            return this.clearPendingMatch();
          }
          break;

        case '/booking-info':
          if (request.method === 'GET') {
            return this.getBookingInfo();
          } else if (request.method === 'PUT') {
            const body = await request.json() as BookingInfo | null;
            return this.setBookingInfo(body);
          } else if (request.method === 'DELETE') {
            return this.clearBookingInfo();
          }
          break;

        case '/search-criteria':
          if (request.method === 'PUT') {
            const body = await request.json() as MatchTutorRequest;
            return this.setSearchCriteria(body);
          }
          break;

        case '/available-tutors':
          if (request.method === 'PUT') {
            const body = await request.json() as MatchTutorResponse[];
            return this.setAvailableTutors(body);
          }
          break;

        case '/reset':
          if (request.method === 'POST') {
            return this.reset();
          }
          break;

        default:
          return new Response('Not Found', { status: 404 });
      }

      return new Response('Method Not Allowed', { status: 405 });
    } catch (error) {
      console.error('ChatSession error:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Initialize state if it doesn't exist
   */
  private async initializeState(): Promise<ChatSessionState> {
    const initialState: ChatSessionState = {
      messages: [
        {
          role: 'assistant',
          content:
            "Hi! 👋 I'm your AI scheduling assistant for the CCSF CS Tutor Squad.\n\nI can help you:\n• Find the perfect tutor for your programming needs\n• Automatically book tutoring sessions\n• Match you with tutors based on your schedule and preferences\n\n**What programming languages or topics do you need help with?**\n\n💡 **Example prompts:**\n• \"I need help with Python\"\n• \"Looking for a Java tutor on Monday\"\n• \"Help with JavaScript, available Tuesday afternoon\"\n• \"Python tutor, online sessions preferred\"",
        },
      ],
      pendingMatch: null,
      lastSearchCriteria: null,
      availableTutorsList: [],
      bookingInfo: null,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.chatState = initialState;
    await this.saveState();
    return initialState;
  }

  /**
   * Load state from durable storage
   */
  private async loadState(): Promise<void> {
    try {
      const stored = await this.state.storage.get<ChatSessionState>('chatState');
      if (stored) {
        this.chatState = stored;
      } else {
        await this.initializeState();
      }
    } catch (error) {
      console.error('Error loading state:', error);
      await this.initializeState();
    }
  }

  /**
   * Save state to durable storage
   */
  private async saveState(): Promise<void> {
    if (this.chatState) {
      try {
        await this.state.storage.put('chatState', this.chatState);
      } catch (error) {
        console.error('Error saving state:', error);
      }
    }
  }

  /**
   * Get all messages
   */
  private async getMessages(): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }
    return new Response(JSON.stringify(this.chatState!.messages), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Add a message to the chat
   */
  private async addMessage(message: ChatMessage): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }

    const newMessage: Message = {
      role: message.role,
      content: message.content,
      tutorMatch: message.tutorMatch,
    };

    this.chatState!.messages.push(newMessage);
    this.chatState!.lastAccessedAt = Date.now();
    await this.saveState();

    return new Response(JSON.stringify({ success: true, message: newMessage }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get full state
   */
  private async getState(): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }
    return new Response(JSON.stringify(this.chatState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Update state
   */
  private async updateState(updates: Partial<ChatSessionState>): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }

    this.chatState = { ...this.chatState!, ...updates };
    this.chatState.lastAccessedAt = Date.now();
    await this.saveState();

    return new Response(JSON.stringify({ success: true, state: this.chatState }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get pending match
   */
  private async getPendingMatch(): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }
    return new Response(JSON.stringify(this.chatState!.pendingMatch), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Set pending match
   */
  private async setPendingMatch(match: MatchTutorResponse | null): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }

    this.chatState!.pendingMatch = match;
    this.chatState!.lastAccessedAt = Date.now();
    await this.saveState();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Clear pending match
   */
  private async clearPendingMatch(): Promise<Response> {
    return this.setPendingMatch(null);
  }

  /**
   * Get booking info
   */
  private async getBookingInfo(): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }
    return new Response(JSON.stringify(this.chatState!.bookingInfo), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Set booking info
   */
  private async setBookingInfo(bookingInfo: BookingInfo | null): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }

    this.chatState!.bookingInfo = bookingInfo;
    this.chatState!.lastAccessedAt = Date.now();
    await this.saveState();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Clear booking info
   */
  private async clearBookingInfo(): Promise<Response> {
    return this.setBookingInfo(null);
  }

  /**
   * Set search criteria
   */
  private async setSearchCriteria(criteria: MatchTutorRequest): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }

    this.chatState!.lastSearchCriteria = criteria;
    this.chatState!.lastAccessedAt = Date.now();
    await this.saveState();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Set available tutors list
   */
  private async setAvailableTutors(tutors: MatchTutorResponse[]): Promise<Response> {
    if (!this.chatState) {
      await this.initializeState();
    }

    this.chatState!.availableTutorsList = tutors;
    this.chatState!.lastAccessedAt = Date.now();
    await this.saveState();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Reset chat session
   */
  private async reset(): Promise<Response> {
    await this.initializeState();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Environment interface for Durable Object
 */
export interface Env {
  CHAT_SESSION: DurableObjectNamespace;
  DB?: D1Database;
  VECTORIZE_INDEX?: VectorizeIndex;
}

