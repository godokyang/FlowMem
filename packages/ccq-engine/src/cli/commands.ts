// CLI 命令定义
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

export const initCommand = new Command('init')
  .description('Initialize default configuration')
  .action(async () => {
    const configPath = path.join(process.cwd(), '.ccq');
    const configFile = path.join(configPath, 'config.yaml');
    
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }

    if (fs.existsSync(configFile)) {
      console.log('Configuration already exists.');
      return;
    }

    const defaultConfig = `
# CCQ Engine Configuration
mode: hybrid
retrieval:
  topK: 10
  rrfK: 60
  weights:
    vector: 1.0
    bm25: 1.0

languages:
  tier1:
    - typescript
    - javascript
    - python
  tier2: []
  tier3: []

embeddings:
  mode: offline
  offline:
    model: Xenova/all-MiniLM-L6-v2

chunker:
  astEnabled: true
  maxChunkSize: 2000
`.trim();

    fs.writeFileSync(configFile, defaultConfig, 'utf-8');
    console.log(`Initialized default configuration at ${configFile}`);
  });

export const indexCommand = new Command('index')
  .description('Index the codebase')
  .option('--full', 'Force full re-indexing')
  .option('--watch', 'Watch mode')
  .option('--resume', 'Resume from last checkpoint')
  .action(async (options) => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    await engine.index(options);
  });

export const contextCommand = new Command('context')
  .argument('<query>', 'Search query')
  .option('--topK <n>', 'Number of chunks', '10')
  .option('--mode <type>', 'Search mode (vector|bm25|hybrid)', 'hybrid')
  .action(async (query, options) => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    const result = await engine.retrieve(query, options);
    console.log(result);
  });

export const askCommand = new Command('ask')
  .argument('<question>', 'Question about codebase')
  .option('--model <name>', 'LLM model', 'gpt-4o-mini')
  .option('--topK <n>', 'Number of context chunks', '10')
  .action(async (question, options) => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    const answer = await engine.ask(question, options);
    console.log(answer);
  });

export const statusCommand = new Command('status')
  .description('Show indexing status')
  .action(async () => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    const stats = await engine.getStatus();
    
    console.log(JSON.stringify(stats, null, 2));
  });

export const exportCommand = new Command('export')
  .description('Export index state to JSON file')
  .argument('<path>', 'Output file path')
  .action(async (path) => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    await engine.exportState(path);
    console.log(`State exported to ${path}`);
  });

export const importCommand = new Command('import')
  .description('Import index state from JSON file')
  .argument('<path>', 'Input file path')
  .action(async (path) => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    await engine.importState(path);
    console.log(`State imported from ${path}`);
  });

export const addRemoteCommand = new Command('add-remote')
  .description('Index a remote file from URL')
  .argument('<url>', 'URL of the file')
  .action(async (url) => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    await engine.addRemoteFile(url);
  });

export const installHooksCommand = new Command('install-hooks')
  .description('Install git hooks for auto-indexing')
  .action(async () => {
    const { ContextEngine } = await import('../engine.js');
    const { ConfigLoader } = await import('../core/config-loader.js');
    
    const config = ConfigLoader.load(process.cwd());
    const engine = new ContextEngine(config);
    await engine.installGitHooks();
  });
