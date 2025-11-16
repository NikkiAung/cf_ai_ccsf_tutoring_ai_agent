// Database access for Next.js and Workers
// Automatically uses real D1 when available, falls back to mock for local dev

import type { Database } from './db';
import type { Tutor } from '@/types';
import { getD1Database } from './d1-client';
import { createD1HTTPClient } from './d1-http-client';

// Mock data from DATA.md
const mockTutors: Tutor[] = [
  {
    id: 1,
    name: 'Aung Nanda O',
    pronouns: 'he/him',
    bio: 'I also go by Nikki. Extrovert who enjoys helping others succeed. Skilled in Python, Java, JavaScript, React, HTML, CSS.',
    mode: 'online',
    skills: ['Python', 'Java', 'JavaScript', 'React', 'HTML', 'CSS'],
    availability: [
      { day: 'Monday', time: '9:30-10:00', mode: 'online' },
      { day: 'Wednesday', time: '4:00-4:30', mode: 'online' },
      { day: 'Wednesday', time: '4:30-5:00', mode: 'online' },
    ],
  },
  {
    id: 2,
    name: 'Mei O',
    pronouns: 'she/they',
    bio: 'Aspiring AI & Linguistics researcher. Daily Arch Linux user. Passionate about Python, Linux, and machine learning concepts.',
    mode: 'online',
    skills: ['Python', 'Linux', 'Debugging'],
    availability: [
      { day: 'Tuesday', time: '11:00-11:30', mode: 'online' },
      { day: 'Tuesday', time: '11:30-12:00', mode: 'online' },
      { day: 'Thursday', time: '2:30-3:00', mode: 'online' },
    ],
  },
  {
    id: 3,
    name: 'Chris H',
    pronouns: 'he/him',
    bio: 'Problem solver and travel enthusiast. Experienced with Python, Java, SQL, JavaScript, CSS, and MIPS assembly.',
    mode: 'on campus',
    skills: ['Python', 'Java', 'SQL', 'JavaScript', 'CSS', 'MIPS Assembly'],
    availability: [
      { day: 'Monday', time: '10:00-10:30', mode: 'on campus' },
      { day: 'Monday', time: '10:30-11:00', mode: 'on campus' },
      { day: 'Friday', time: '11:00-11:30', mode: 'on campus' },
    ],
  },
  {
    id: 4,
    name: 'Claire C',
    pronouns: null,
    bio: 'Second-year CS major. Swimmer, pianist, and board game lover. Excited to tutor programming fundamentals.',
    mode: 'on campus',
    skills: ['Python', 'C++', 'Debugging'],
    availability: [
      { day: 'Wednesday', time: '9:30-10:00', mode: 'on campus' },
      { day: 'Wednesday', time: '10:00-10:30', mode: 'on campus' },
      { day: 'Wednesday', time: '7:00-7:30', mode: 'on campus' },
    ],
  },
];

class MockDatabase implements Database {
  prepare(query: string) {
    // Create a bound statement handler
    const createBoundStatement = (values: unknown[] = []) => {
      // Simple query parser for mock database
      const lowerQuery = query.toLowerCase().trim();

      if (lowerQuery.includes('select') && lowerQuery.includes('from tutors')) {
        if (lowerQuery.includes('where id = ?')) {
          const id = values[0] as number;
          const tutor = mockTutors.find((t) => t.id === id);
          return {
            first: async <T>() => {
              if (!tutor) return null;
              return {
                id: tutor.id,
                name: tutor.name,
                pronouns: tutor.pronouns,
                bio: tutor.bio,
                mode: tutor.mode,
              } as T;
            },
            all: async <T>() => ({ results: [] as T[] }),
            run: async () => ({ success: true, meta: { changes: 0 } }),
          };
        }
        // Get all tutors
        return {
          first: async <T>() => null as T | null,
          all: async <T>() => ({
            results: mockTutors.map((t) => ({
              id: t.id,
              name: t.name,
              pronouns: t.pronouns,
              bio: t.bio,
              mode: t.mode,
            })) as T[],
          }),
          run: async () => ({ success: true, meta: { changes: 0 } }),
        };
      }

        if (lowerQuery.includes('select') && lowerQuery.includes('from skills')) {
          const tutorId = values[0] as number;
          const tutor = mockTutors.find((t) => t.id === tutorId);
          if (!tutor) {
            return {
              first: async <T>() => null as T | null,
              all: async <T>() => ({ results: [] as T[] }),
              run: async () => ({ success: true, meta: { changes: 0 } }),
            };
          }
          return {
            first: async <T>() => null as T | null,
            all: async <T>() => ({
              results: tutor.skills.map((skill, idx) => ({
                id: idx + 1,
                name: skill,
              })) as T[],
            }),
            run: async () => ({ success: true, meta: { changes: 0 } }),
          };
        }

        if (lowerQuery.includes('select') && lowerQuery.includes('from availability')) {
          const tutorId = values[0] as number;
          const tutor = mockTutors.find((t) => t.id === tutorId);
          if (!tutor) {
            return {
              first: async <T>() => null as T | null,
              all: async <T>() => ({ results: [] as T[] }),
              run: async () => ({ success: true, meta: { changes: 0 } }),
            };
          }
          return {
            first: async <T>() => null as T | null,
            all: async <T>() => ({
              results: tutor.availability.map((a) => ({
                day: a.day,
                time: a.time,
                mode: a.mode,
              })) as T[],
            }),
            run: async () => ({ success: true, meta: { changes: 0 } }),
          };
        }

        // Default empty response
        return {
          first: async <T>() => null as T | null,
          all: async <T>() => ({ results: [] as T[] }),
          run: async () => ({ success: true, meta: { changes: 0 } }),
        };
      };

    // Return object with bind() method and also allow calling all() directly
    const boundStatement = createBoundStatement([]);
    return {
      bind: (...values: unknown[]) => createBoundStatement(values),
      // Allow calling all() directly on prepared statement (no bind needed)
      all: boundStatement.all,
      first: boundStatement.first,
      run: boundStatement.run,
    };
  }
}

// Export a singleton instance
const mockDbInstance = new MockDatabase();
// Add mockTutors property for direct access
Object.defineProperty(mockDbInstance, 'mockTutors', {
  value: mockTutors,
  writable: false,
  enumerable: true,
  configurable: false,
});
export const mockDb = mockDbInstance as unknown as Database & { mockTutors: Tutor[] };

// Helper to get database instance
// Priority: Workers env.DB > D1 HTTP API > Mock DB
export function getDatabase(): Database {
  // 1. Try Workers environment (env.DB binding)
  // This works when deployed to Cloudflare Workers or running with wrangler dev
  if (typeof globalThis !== 'undefined') {
    const env = (globalThis as any).env;
    if (env && env.DB) {
      console.log('✅ Using Cloudflare D1 via Workers binding (env.DB)');
      return env.DB as Database;
    }
  }

  // 2. Try D1 HTTP API client (for Next.js with API token)
  // Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
  // Only try if both are set AND not empty, otherwise skip to mock DB
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  if (accountId && apiToken && accountId.trim() !== '' && apiToken.trim() !== '' && !apiToken.includes('your-')) {
    const httpClient = createD1HTTPClient();
    if (httpClient) {
      console.log('✅ Using Cloudflare D1 via HTTP API');
      return httpClient;
    }
  }

  // 3. Fall back to mock database (for local Next.js development)
  console.log('⚠️  Using mock database (set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to use real D1)');
  return mockDb;
}

// Export mock tutors for direct access if needed
export { mockTutors };

