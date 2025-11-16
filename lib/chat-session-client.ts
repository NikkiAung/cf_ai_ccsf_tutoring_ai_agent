// Client library for interacting with chat session Durable Objects
// Provides a unified interface for both Workers and Next.js environments

import type { Message, MatchTutorResponse, MatchTutorRequest } from '@/types';
import type { BookingInfo, ChatSessionState } from '@/durable-objects/chat-session';

// Re-export types for convenience
export type { BookingInfo, ChatSessionState };

/**
 * Client for managing chat sessions
 * Works in both Workers (Durable Objects) and Next.js (HTTP API)
 */
export class ChatSessionClient {
  private sessionId: string;
  private baseUrl: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    // In Next.js, use API route. In Workers, will use direct Durable Object access
    this.baseUrl = typeof window !== 'undefined' 
      ? `/api/chat/session/${sessionId}` 
      : `http://localhost:3000/api/chat/session/${sessionId}`;
  }

  /**
   * Get all messages
   */
  async getMessages(): Promise<Message[]> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`);
      if (!response.ok) {
        if (response.status === 503) {
          // Durable Objects not available, try localStorage fallback
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`chat-messages-${this.sessionId}`);
            if (stored) {
              return JSON.parse(stored);
            }
          }
          return [];
        }
        throw new Error(`Failed to get messages: ${response.statusText}`);
      }
      const messages = await response.json() as Message[];
      
      // Save to localStorage as backup (for Next.js dev)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`chat-messages-${this.sessionId}`, JSON.stringify(messages));
      }
      
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      // Try localStorage fallback
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`chat-messages-${this.sessionId}`);
        if (stored) {
          return JSON.parse(stored) as Message[];
        }
      }
      return [];
    }
  }

  /**
   * Add a message
   */
  async addMessage(message: Omit<Message, 'timestamp'>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        if (response.status === 503) {
          // Durable Objects not available, use localStorage fallback
          if (typeof window !== 'undefined') {
            const existing = await this.getMessages();
            const updated = [...existing, message];
            localStorage.setItem(`chat-messages-${this.sessionId}`, JSON.stringify(updated));
          }
          return;
        }
        throw new Error(`Failed to add message: ${response.statusText}`);
      }
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        const existing = await this.getMessages();
        const updated = [...existing, message];
        localStorage.setItem(`chat-messages-${this.sessionId}`, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error adding message:', error);
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const existing = await this.getMessages();
        const updated = [...existing, message];
        localStorage.setItem(`chat-messages-${this.sessionId}`, JSON.stringify(updated));
      }
    }
  }

  /**
   * Get full session state
   */
  async getState(): Promise<ChatSessionState | null> {
    try {
      const response = await fetch(`${this.baseUrl}`);
      if (!response.ok) {
        if (response.status === 503) {
          // Durable Objects not available, try localStorage fallback
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Durable Objects Worker not running. Using localStorage fallback.');
            const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
            if (stored) {
              return JSON.parse(stored) as ChatSessionState;
            }
          }
          return null;
        }
        throw new Error(`Failed to get state: ${response.statusText}`);
      }
      const state = await response.json() as ChatSessionState;
      
      // Log when Durable Objects are being used
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('✅ Using Cloudflare Durable Objects for chat state');
      }
      
      // Save to localStorage as backup (for Next.js dev)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(state));
      }
      
      return state;
    } catch (error) {
      console.error('Error getting state:', error);
      // Try localStorage fallback (only in dev mode)
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Durable Objects Worker unavailable. Using localStorage fallback.');
        const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return null;
    }
  }

  /**
   * Update state
   */
  async updateState(updates: Partial<ChatSessionState>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        if (response.status === 503) {
          // Durable Objects not available, use localStorage fallback
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Durable Objects Worker not running. Saving to localStorage fallback.');
            // Try to get existing state from localStorage first (avoid extra GET request)
            const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
            const existing = stored ? JSON.parse(stored) as ChatSessionState : null;
            const updated = existing ? { ...existing, ...updates } : { 
              messages: [],
              pendingMatch: null,
              lastSearchCriteria: null,
              availableTutorsList: [],
              bookingInfo: null,
              createdAt: Date.now(),
              lastAccessedAt: Date.now(),
              ...updates
            } as ChatSessionState;
            localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
          }
          return;
        }
        throw new Error(`Failed to update state: ${response.statusText}`);
      }
      
      // Log when Durable Objects are being used
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('✅ Saving state to Cloudflare Durable Objects');
      }
      
      // Parse response if available
      if (typeof window !== 'undefined' && response.ok) {
        try {
          const state = await response.json() as { state?: ChatSessionState } | ChatSessionState;
          // Save to localStorage as backup
          const stateToStore = (state as any)?.state || state;
          if (stateToStore) {
            localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(stateToStore));
          }
        } catch (e) {
          // Response might not be JSON, that's okay
        }
      }
    } catch (error) {
      console.error('Error updating state:', error);
      // Fallback to localStorage (try localStorage directly, avoid extra GET request)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`chat-state-${this.sessionId}`);
        const existing = stored ? JSON.parse(stored) as ChatSessionState | null : null;
        const updated = existing ? { ...existing, ...updates } : {
          messages: [],
          pendingMatch: null,
          lastSearchCriteria: null,
          availableTutorsList: [],
          bookingInfo: null,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          ...updates
        } as ChatSessionState;
        localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
      }
    }
  }

  /**
   * Get pending match
   */
  async getPendingMatch(): Promise<MatchTutorResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/pending-match`);
      if (!response.ok) {
        if (response.status === 503) {
          return null;
        }
        throw new Error(`Failed to get pending match: ${response.statusText}`);
      }
      return await response.json() as MatchTutorResponse | null;
    } catch (error) {
      console.error('Error getting pending match:', error);
      return null;
    }
  }

  /**
   * Set pending match
   */
  async setPendingMatch(match: MatchTutorResponse | null): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/pending-match`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match),
      });
      if (!response.ok) {
        if (response.status === 503) {
          // Durable Objects not available, use localStorage fallback
          if (typeof window !== 'undefined') {
            const existing = await this.getState();
            const updated = { ...existing, pendingMatch: match } as ChatSessionState;
            localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
          }
          return;
        }
        throw new Error(`Failed to set pending match: ${response.statusText}`);
      }
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        const existing = await this.getState() || { messages: [], availableTutorsList: [] };
        const updated = { ...existing, pendingMatch: match } as ChatSessionState;
        localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error setting pending match:', error);
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const existing = await this.getState() || { messages: [], availableTutorsList: [] };
        const updated = { ...existing, pendingMatch: match } as ChatSessionState;
        localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
      }
    }
  }

  /**
   * Get booking info
   */
  async getBookingInfo(): Promise<BookingInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/booking-info`);
      if (!response.ok) {
        if (response.status === 503) {
          return null;
        }
        throw new Error(`Failed to get booking info: ${response.statusText}`);
      }
      return await response.json() as BookingInfo | null;
    } catch (error) {
      console.error('Error getting booking info:', error);
      return null;
    }
  }

  /**
   * Set booking info
   */
  async setBookingInfo(bookingInfo: BookingInfo | null): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/booking-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingInfo),
      });
      if (!response.ok) {
        if (response.status === 503) {
          // Durable Objects not available, use localStorage fallback
          if (typeof window !== 'undefined') {
            const existing = await this.getState();
            const updated = { ...existing, bookingInfo } as ChatSessionState;
            localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
          }
          return;
        }
        throw new Error(`Failed to set booking info: ${response.statusText}`);
      }
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        const existing = await this.getState() || { messages: [], availableTutorsList: [] };
        const updated = { ...existing, bookingInfo } as ChatSessionState;
        localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error setting booking info:', error);
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const existing = await this.getState() || { messages: [], availableTutorsList: [] };
        const updated = { ...existing, bookingInfo } as ChatSessionState;
        localStorage.setItem(`chat-state-${this.sessionId}`, JSON.stringify(updated));
      }
    }
  }

  /**
   * Set search criteria
   */
  async setSearchCriteria(criteria: MatchTutorRequest): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/search-criteria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      });
      if (!response.ok && response.status !== 503) {
        throw new Error(`Failed to set search criteria: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting search criteria:', error);
    }
  }

  /**
   * Set available tutors
   */
  async setAvailableTutors(tutors: MatchTutorResponse[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/available-tutors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tutors),
      });
      if (!response.ok && response.status !== 503) {
        throw new Error(`Failed to set available tutors: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting available tutors:', error);
    }
  }

  /**
   * Reset session
   */
  async reset(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/reset`, {
        method: 'POST',
      });
      if (!response.ok && response.status !== 503) {
        throw new Error(`Failed to reset session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }
}

/**
 * Generate or get session ID
 * Uses localStorage or generates a new one
 */
export function getSessionId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('chatSessionId');
    if (stored) {
      return stored;
    }
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatSessionId', newId);
    return newId;
  }
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

