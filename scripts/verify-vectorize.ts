// Script to verify embeddings are stored in Cloudflare Vectorize

import { execSync } from 'child_process';

async function verifyVectorize() {
  console.log('🔍 Verifying Cloudflare Vectorize index...\n');

  try {
    // 1. List all indexes
    console.log('📋 Listing all Vectorize indexes:');
    console.log('─'.repeat(50));
    execSync('wrangler vectorize list', { stdio: 'inherit' });
    console.log('');

    // 2. Get details of our index
    console.log('📊 Getting details for ccsf-tutors-index:');
    console.log('─'.repeat(50));
    execSync('wrangler vectorize get ccsf-tutors-index', { stdio: 'inherit' });
    console.log('');

    // 3. Try to query the index (if it has vectors)
    console.log('💡 To query the index with a test vector, run:');
    console.log('   wrangler vectorize query ccsf-tutors-index --vector "[0.1,0.2,...]" --topK 5');
    console.log('');

  } catch (error) {
    console.error('❌ Error verifying Vectorize:', error);
    console.error('\n💡 Make sure you are:');
    console.error('   1. Logged into Cloudflare: wrangler login');
    console.error('   2. The index exists: wrangler vectorize list');
    process.exit(1);
  }
}

if (require.main === module) {
  verifyVectorize();
}

export { verifyVectorize };

