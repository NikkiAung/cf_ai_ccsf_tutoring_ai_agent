// Standalone Cloudflare Worker to upload embeddings to Vectorize
// This worker reads tutor data and uploads embeddings to Cloudflare Vectorize
//
// Usage:
//   1. Set your OpenAI API key: wrangler secret put OPENAI_API_KEY
//   2. Run locally: wrangler dev worker-upload-embeddings.ts
//   3. Call: curl -X POST http://localhost:8787/upload
//   4. Or deploy: wrangler deploy worker-upload-embeddings.ts

export interface Env {
  VECTORIZE_INDEX: VectorizeIndex;
  OPENAI_API_KEY: string;
}

// Tutor data structure (simplified)
interface Tutor {
  id: number;
  name: string;
  bio: string;
  skills: string[];
  mode: string;
  availability: Array<{ day: string; time: string; mode: string }>;
}

// Tutor data (from your mockDb)
const TUTORS: Tutor[] = [
  {
    id: 1,
    name: 'Aung Nanda O',
    bio: 'I also go by Nikki. Extrovert who enjoys helping others succeed. Skilled in Python, Java, JavaScript, React, HTML, CSS.',
    skills: ['Python', 'Java', 'JavaScript', 'React', 'HTML', 'CSS'],
    mode: 'online',
    availability: [
      { day: 'Monday', time: '9:30-10:00', mode: 'online' },
      { day: 'Wednesday', time: '4:00-4:30', mode: 'online' },
      { day: 'Wednesday', time: '4:30-5:00', mode: 'online' },
    ],
  },
  {
    id: 2,
    name: 'Mei O',
    bio: 'Aspiring AI & Linguistics researcher. Daily Arch Linux user. Passionate about Python, Linux, and machine learning concepts.',
    skills: ['Python', 'Linux', 'Debugging'],
    mode: 'online',
    availability: [
      { day: 'Monday', time: '10:00-10:30', mode: 'online' },
      { day: 'Wednesday', time: '2:00-2:30', mode: 'online' },
      { day: 'Friday', time: '11:00-11:30', mode: 'online' },
    ],
  },
  {
    id: 3,
    name: 'Chris H',
    bio: 'Problem solver and travel enthusiast. Experienced with Python, Java, SQL, JavaScript, CSS, and MIPS assembly.',
    skills: ['Python', 'Java', 'SQL', 'JavaScript', 'CSS', 'MIPS Assembly'],
    mode: 'on campus',
    availability: [
      { day: 'Monday', time: '10:00-10:30', mode: 'on campus' },
      { day: 'Tuesday', time: '2:00-2:30', mode: 'on campus' },
      { day: 'Thursday', time: '3:00-3:30', mode: 'on campus' },
    ],
  },
  {
    id: 4,
    name: 'Claire C',
    bio: 'Second-year CS major. Swimmer, pianist, and board game lover. Excited to tutor programming fundamentals.',
    skills: ['Python', 'C++', 'Debugging'],
    mode: 'on campus',
    availability: [
      { day: 'Tuesday', time: '1:00-1:30', mode: 'on campus' },
      { day: 'Thursday', time: '2:00-2:30', mode: 'on campus' },
      { day: 'Friday', time: '10:00-10:30', mode: 'on campus' },
    ],
  },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'Embeddings upload worker is running',
          tutorCount: TUTORS.length,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload embeddings endpoint
    if (url.pathname === '/upload' && request.method === 'POST') {
      try {
        if (TUTORS.length === 0) {
          return new Response(
            JSON.stringify({
              error: 'No tutors found',
              message: 'Please add tutor data to the worker file',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Processing ${TUTORS.length} tutors...`);

        // Generate embeddings and prepare vectors
        const vectors = [];

        for (const tutor of TUTORS) {
          try {
            // Create comprehensive text representation
            const tutorText = `
Tutor: ${tutor.name}
Bio: ${tutor.bio}
Skills: ${tutor.skills.join(', ')}
Mode: ${tutor.mode}
Availability: ${tutor.availability.map(a => `${a.day} ${a.time} (${a.mode})`).join(', ')}
            `.trim();

            // Generate embedding using OpenAI
            const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: tutorText,
              }),
            });

            if (!embeddingResponse.ok) {
              throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
            }

            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;

            vectors.push({
              id: `tutor-${tutor.id}`,
              values: embedding,
              metadata: {
                tutorId: tutor.id,
                name: tutor.name,
                skills: tutor.skills,
                mode: tutor.mode,
              },
            });

            console.log(`✅ Generated embedding for ${tutor.name}`);
          } catch (error) {
            console.error(`❌ Failed to process ${tutor.name}:`, error);
            // Continue with other tutors
          }
        }

        if (vectors.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Failed to generate any embeddings' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Upload to Vectorize
        console.log(`Uploading ${vectors.length} vectors to Vectorize...`);
        const result = await env.VECTORIZE_INDEX.upsert(vectors);

        // Vectorize upsert returns { count: number } or the count directly
        const uploadedCount = result?.count ?? vectors.length;

        console.log(`✅ Successfully uploaded ${uploadedCount} vectors`);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully uploaded ${uploadedCount} embeddings to Cloudflare Vectorize`,
            count: uploadedCount,
            vectorsProcessed: vectors.length,
            index: 'ccsf-tutors-index',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Error:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to upload embeddings',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
