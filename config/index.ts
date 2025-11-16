// Configuration constants for the CCSF Tutoring AI Agent

export const config = {
  // Database configuration
  database: {
    // D1 database binding name (set in wrangler.toml)
    binding: 'DB' as const,
  },

  // Vectorize configuration
  vectorize: {
    // Vectorize index binding name (set in wrangler.toml)
    binding: 'VECTORIZE_INDEX' as const,
    // Embedding model dimensions
    dimensions: 1536, // text-embedding-3-small dimensions
  },

  // OpenAI API configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o-mini', // Using a cost-effective model
    temperature: 0.7,
  },

  // Calendly configuration
  calendly: {
    baseUrl: 'https://calendly.com/cs-tutor-squad/30min',
    defaultDuration: 30, // minutes
  },

  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 30000, // 30 seconds
  },

  // Application settings
  app: {
    name: 'CCSF CS Tutor Squad Scheduler',
    version: '0.1.0',
  },
} as const;

