/**
 * CLI Audit 命令
 */

import { Command } from 'commander';

export const auditCommands = new Command('audit')
  .description('审计管理命令');

auditCommands.command('log')
  .description('查看审计日志')
  .action(() => {
    console.log('功能开发中...');
  });
