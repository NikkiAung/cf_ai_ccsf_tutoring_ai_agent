// Script to upload embeddings to Cloudflare Vectorize
// This creates a temporary Worker that uploads embeddings, then exits

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { getDatabase } from '../lib/mockDb';
import { getAllTutors } from '../lib/db';
import { generateTutorEmbedding } from '../lib/embeddings';

/**
 * This script generates embeddings and outputs them in a format
 * that can be used with wrangler or a Worker to upload to Vectorize
 */
async function main() {
  console.log('🚀 Preparing embeddings for Cloudflare Vectorize upload...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set!');
    process.exit(1);
  }

  try {
    const db = getDatabase();
    const tutors = await getAllTutors(db);

    if (tutors.length === 0) {
      console.log('⚠️  No tutors found.');
      return;
    }

    console.log(`📚 Found ${tutors.length} tutors\n`);
    console.log('🔄 Generating embeddings...\n');

    // Generate embeddings
    const vectors = await Promise.all(
      tutors.map(async (tutor) => {
        const embedding = await generateTutorEmbedding(tutor);
        return {
          id: `tutor-${tutor.id}`,
          values: embedding,
          metadata: {
            tutorId: tutor.id,
            name: tutor.name,
            skills: tutor.skills,
            mode: tutor.mode,
          },
        };
      })
    );

    console.log('✅ Embeddings generated!\n');
    console.log('📝 To upload to Cloudflare Vectorize, you have two options:\n');
    console.log('Option 1: Deploy a Worker and use the API endpoint');
    console.log('  - Deploy your app to Cloudflare Workers');
    console.log('  - Call: POST /api/embeddings/seed');
    console.log('  - The endpoint will use env.VECTORIZE_INDEX (real Vectorize)\n');
    
    console.log('Option 2: Use wrangler dev with a Worker script');
    console.log('  - Create a Worker that uses env.VECTORIZE_INDEX');
    console.log('  - Run: wrangler dev');
    console.log('  - Call the Worker endpoint to upload\n');

    console.log('💡 The embeddings are ready. Vector count:', vectors.length);
    console.log('   First vector ID:', vectors[0]?.id);
    console.log('   First vector dimensions:', vectors[0]?.values.length);
    
    // Save to file for reference
    const fs = await import('fs/promises');
    await fs.writeFile(
      'embeddings-output.json',
      JSON.stringify(vectors, null, 2)
    );
    console.log('\n📄 Embeddings saved to: embeddings-output.json');
    console.log('   (This file shows what will be uploaded)');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

