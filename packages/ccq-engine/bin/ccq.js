#!/usr/bin/env node
// @ccq/engine CLI 入口

const { program } = require('commander');
const { ContextEngine } = require('./src/engine.js');

program
  .name('ccq')
  .description('Codebase Context Query Engine');

program.command('index')
  .description('Index the codebase')
  .option('--full', 'Force full re-indexing')
  .option('--watch', 'Watch mode')
  .action(async (options) => {
    console.log('Indexing codebase...', options);
    // TODO: 实现索引逻辑
  });

program.command('context')
  .argument('<query>', 'Search query')
  .option('--topK <n>', 'Number of chunks', '10')
  .action(async (query, options) => {
    console.log('Searching:', query, options);
    // TODO: 实现检索逻辑
  });

program.parse();
