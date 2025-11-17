// LangChain Memory/Checkpointer implementation (Lesson 6)
// Implements MemorySaver for short-term in-memory conversation storage

import { MemorySaver } from '@langchain/langgraph';

// Global MemorySaver instance (shared across all sessions)
// This stores conversation state in memory for the current process
let memorySaverInstance: MemorySaver | null = null;

/**
 * Get or create the global MemorySaver instance
 * MemorySaver stores conversation checkpoints in memory (short-term)
 * For production, consider using PostgresSaver or SqliteSaver for persistence
 */
export function getMemorySaver(): MemorySaver {
  if (!memorySaverInstance) {
    memorySaverInstance = new MemorySaver();
  }
  return memorySaverInstance;
}

/**
 * Conversation memory wrapper for thread-based context (Lesson 6)
 * Provides thread_id configuration and MemorySaver checkpointer for LangChain agents
 * 
 * Note: MemorySaver is in-memory only (lost on server restart)
 * For persistence, we use Durable Objects which stores messages permanently
 */
export class ConversationMemory {
  private threadId: string;
  private checkpointer: MemorySaver;

  constructor(threadId: string) {
    this.threadId = threadId;
    this.checkpointer = getMemorySaver();
  }

  /**
   * Get the config object for this conversation thread
   * This provides thread_id for LangChain agents to maintain context
   */
  getConfig() {
    return {
      configurable: {
        thread_id: this.threadId,
      },
    };
  }

  /**
   * Get the MemorySaver checkpointer instance
   * This can be used with LangGraph agents/workflows
   */
  getCheckpointer(): MemorySaver {
    return this.checkpointer;
  }
}

/**
 * Create a conversation memory instance for a session (Lesson 6)
 * This provides thread-based context and MemorySaver for LangChain agents
 * 
 * Usage:
 * const memory = createConversationMemory(sessionId);
 * const config = memory.getConfig(); // { configurable: { thread_id: sessionId } }
 * const checkpointer = memory.getCheckpointer(); // MemorySaver instance
 */
export function createConversationMemory(sessionId: string): ConversationMemory {
  return new ConversationMemory(sessionId);
}

