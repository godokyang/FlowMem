/**
 * CLI Hook 命令
 */

import { Command } from 'commander';

export const hookCommands = new Command('hook')
  .description('Git Hook 管理命令');

hookCommands.command('install')
  .description('安装 Git Hook')
  .action(() => {
    console.log('功能开发中...');
  });
