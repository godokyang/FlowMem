// CLI 命令定义
import { Command } from 'commander';

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
