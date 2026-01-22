import { ContextEngine } from '../src/engine.js';
import { ConfigLoader } from '../src/core/config-loader.js';
import path from 'path';

// Evaluation dataset: Query -> Expected File/Content
const DATASET = [
  {
    query: "How to initialize ContextEngine?",
    expected: "src/engine.ts"
  },
  {
    query: "What is the default k1 for BM25?",
    expected: "src/retrieval/bm25.ts"
  },
  {
    query: "How does the logger work?",
    expected: "src/core/logger.ts"
  }
];

async function evaluate() {
  const config = ConfigLoader.load(process.cwd());
  const engine = new ContextEngine(config);

  // Ensure indexed
  await engine.index();

  console.log('\nRunning Retrieval Evaluation...\n');
  let score = 0;

  for (const item of DATASET) {
    console.log(`Query: "${item.query}"`);
    const result = await engine.retrieve(item.query, { topK: 5 });
    
    // Check if expected file is in the result (simple string check on packed context)
    // In a real eval we'd check structured results, but retrieve returns string.
    // context-packer includes "=== FILE: path ==="
    
    const hit = result.includes(item.expected);
    if (hit) {
      console.log(`✅ Found expected: ${item.expected}`);
      score++;
    } else {
      console.log(`❌ Missed expected: ${item.expected}`);
    }
    console.log('---');
  }

  const accuracy = (score / DATASET.length) * 100;
  console.log(`Accuracy: ${accuracy.toFixed(1)}% (${score}/${DATASET.length})`);
}

evaluate().catch(console.error);
