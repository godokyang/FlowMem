/**
 * CLI 入口
 *
 * 使用 commander 实现命令行工具
 */

import { Command } from 'commander';
import { workflowCommands } from './commands/workflow';
import { todoCommands } from './commands/todo';
import { auditCommands } from './commands/audit';
import { hookCommands } from './commands/hook';

const program = new Command();

program
  .name('flowmem')
  .description('FlowMem Workflow Engine CLI')
  .version('2.0.0');

// 注册命令组
program.addCommand(workflowCommands);
program.addCommand(todoCommands);
program.addCommand(auditCommands);
program.addCommand(hookCommands);

// 错误处理
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
