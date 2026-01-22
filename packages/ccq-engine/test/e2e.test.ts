import path from 'path';
import fs from 'fs-extra';
import { ContextEngine } from '../src/engine.js';
import { ConfigLoader } from '../src/core/config-loader.js';

describe('E2E: Indexing and Retrieval', () => {
  const testRoot = path.join(__dirname, 'temp-e2e');
  
  beforeAll(async () => {
    await fs.mkdirp(testRoot);
    
    await fs.writeFile(path.join(testRoot, 'hello.ts'), 'export function sayHello() { console.log("Hello World"); }');
    await fs.writeFile(path.join(testRoot, 'math.ts'), 'export const add = (a: number, b: number) => a + b;');
    
    const configPath = path.join(testRoot, '.ccq/config.yaml');
    await fs.outputFile(configPath, 'mode: hybrid\n');
  });

  afterAll(async () => {
    await fs.remove(testRoot);
  });

  test('should index and retrieve code', async () => {
    const config = ConfigLoader.load(testRoot);
    config.chunker = { astEnabled: false }; 
    const engine = new ContextEngine(config);

    await engine.index({ full: true });

    const status = await engine.getStatus();
    expect(status.files).toBeGreaterThanOrEqual(2);
    expect(status.chunks).toBeGreaterThanOrEqual(2);

    const result = await engine.retrieve('add function');
    expect(result).toContain('math.ts');
    expect(result).toContain('export const add');
  });
});
