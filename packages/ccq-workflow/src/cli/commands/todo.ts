/**
 * CLI Todo 命令
 */

import { Command } from 'commander';

export const todoCommands = new Command('todo')
  .description('任务管理命令');

todoCommands.command('list')
  .description('列出所有任务')
  .action(() => {
    console.log('功能开发中...');
  });

todoCommands.command('add')
  .description('添加新任务')
  .argument('<content>', '任务内容')
  .action((content) => {
    console.log(`添加任务: ${content}`);
  });
