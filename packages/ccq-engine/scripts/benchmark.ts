import fs from 'fs-extra';
import path from 'path';
import { performance } from 'perf_hooks';
import { ContextEngine } from '../src/engine.js';
import { ConfigLoader } from '../src/core/config-loader.js';

const TEST_DIR = path.join(__dirname, 'benchmark_temp');
const NUM_FILES = 1000;
const FILE_SIZE = 1024; // 1KB

async function generateTestData() {
  await fs.ensureDir(TEST_DIR);
  console.log(`Generating ${NUM_FILES} files...`);
  
  for (let i = 0; i < NUM_FILES; i++) {
    const content = `// File ${i}\n` + 'const x = ' + Math.random() + ';\n'.repeat(FILE_SIZE / 20);
    await fs.writeFile(path.join(TEST_DIR, `file_${i}.ts`), content);
  }
}

async function runBenchmark() {
  await generateTestData();

  const configPath = path.join(TEST_DIR, '.ccq/config.yaml');
  await fs.outputFile(configPath, 'mode: hybrid\n');
  
  const config = ConfigLoader.load(TEST_DIR);
  // Disable AST chunking for speed in this large bench or keep it to test real perf
  config.chunker = { astEnabled: false }; 
  
  const engine = new ContextEngine(config);

  console.log('Starting indexing benchmark...');
  const start = performance.now();
  
  await engine.index({ full: true });
  
  const end = performance.now();
  const duration = (end - start) / 1000;
  
  console.log(`\nIndexing completed in ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(NUM_FILES / duration).toFixed(2)} files/s`);
  
  const status = await engine.getStatus();
  console.log('Stats:', JSON.stringify(status, null, 2));

  // Cleanup
  await fs.remove(TEST_DIR);
}

runBenchmark().catch(console.error);
