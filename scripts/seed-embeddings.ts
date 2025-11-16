// Script to generate and store embeddings for all tutors
// Run this after adding new tutors to populate Vectorize

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { getDatabase } from '../lib/mockDb';
import { getAllTutors } from '../lib/db';
import { storeTutorEmbeddings } from '../lib/vectorize';
import type { Tutor } from '../types';

async function main() {
  console.log('🚀 Starting embedding generation for tutors...\n');

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

    // Generate and store embeddings
    console.log('🔄 Generating embeddings...');
    await storeTutorEmbeddings(tutors);

    console.log('\n✅ Successfully generated and stored embeddings for all tutors!');
    console.log(`📊 Total tutors processed: ${tutors.length}`);
    console.log('\n💡 Embeddings are now ready for semantic search (RAG)');
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as seedEmbeddings };

