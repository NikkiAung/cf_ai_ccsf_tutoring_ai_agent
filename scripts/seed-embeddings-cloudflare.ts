// Script to generate and store embeddings directly in Cloudflare Vectorize
// This uses wrangler to interact with the actual Cloudflare Vectorize index

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { getDatabase } from '../lib/mockDb';
import { getAllTutors } from '../lib/db';
import { generateTutorEmbedding } from '../lib/embeddings';
import type { Tutor } from '../types';

/**
 * Store embeddings in Cloudflare Vectorize using wrangler
 */
async function storeInCloudflareVectorize(
  tutorId: string,
  embedding: number[],
  metadata: Record<string, unknown>
): Promise<void> {
  const vectorData = {
    id: tutorId,
    values: embedding,
    metadata: metadata,
  };

  // Use wrangler to upsert the vector
  // Note: This requires wrangler to be installed and authenticated
  const command = `wrangler vectorize insert ccsf-tutors-index --vector '${JSON.stringify(vectorData)}'`;
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Stored embedding for ${tutorId}`);
  } catch (error) {
    console.error(`❌ Failed to store embedding for ${tutorId}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting embedding generation for Cloudflare Vectorize...\n');

  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set!');
    console.error('\n📝 Please add your OpenAI API key to .env.local:');
    console.error('   OPENAI_API_KEY=your-api-key-here');
    console.error('\n🔗 Get your API key from: https://platform.openai.com/api-keys\n');
    process.exit(1);
  }

  console.log('✅ OpenAI API key found\n');

  try {
    // Get all tutors from database
    const db = getDatabase();
    const tutors = await getAllTutors(db);

    if (tutors.length === 0) {
      console.log('⚠️  No tutors found in database. Please add tutors first.');
      return;
    }

    console.log(`📚 Found ${tutors.length} tutors to process\n`);

    // Generate embeddings and store in Cloudflare Vectorize
    console.log('🔄 Generating embeddings and storing in Cloudflare Vectorize...\n');

    for (const tutor of tutors) {
      try {
        console.log(`Processing: ${tutor.name}...`);
        
        // Generate embedding
        const embedding = await generateTutorEmbedding(tutor);
        
        // Store in Cloudflare Vectorize
        await storeInCloudflareVectorize(
          `tutor-${tutor.id}`,
          embedding,
          {
            tutorId: tutor.id,
            name: tutor.name,
            skills: tutor.skills,
            mode: tutor.mode,
          }
        );
      } catch (error) {
        console.error(`Failed to process ${tutor.name}:`, error);
      }
    }

    console.log('\n✅ Successfully generated and stored embeddings in Cloudflare Vectorize!');
    console.log(`📊 Total tutors processed: ${tutors.length}`);
    console.log('\n💡 Embeddings are now stored in Cloudflare Vectorize index: ccsf-tutors-index');
    console.log('\n🔍 Verify with: wrangler vectorize get ccsf-tutors-index');
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as seedEmbeddingsCloudflare };

