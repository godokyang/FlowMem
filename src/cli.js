const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

const program = new Command();

program
  .name('flowmem')
  .description('FlowMem - 上下文记忆系统 CLI')
  .version('1.0.0');

program
  .command('init')
  .description('初始化 FlowMem 到当前项目')
  .option('-a, --adapter <name>', '指定适配器 (cursor|claude-code|windsurf|copilot|cline|trae|gemini)')
  .option('-f, --force', '强制覆盖现有文件')
  .option('-g, --global', '全局安装到用户目录')
  .option('--skip-agentmem', '不创建 .agentmem/ 运行时目录')
  .option('--with-mcp', '启用 LLM 审核（MCP）')
  .action(async (options) => {
    try {
      const initCommand = require('./commands/init');
      await initCommand(options);
    } catch (error) {
      console.error(chalk.red('❌ 初始化失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('audit [check]')
  .description('运行审核检查')
  .option('--json', '输出 JSON 格式')
  .action(async (check, options) => {
    try {
      const auditCommand = require('./commands/audit');
      await auditCommand(check, options);
    } catch (error) {
      console.error(chalk.red('❌ 审核失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('查看当前状态')
  .action(async () => {
    try {
      const statusCommand = require('./commands/status');
      await statusCommand();
    } catch (error) {
      console.error(chalk.red('❌ 获取状态失败:'), error.message);
      process.exit(1);
    }
  });

program
  .command('upgrade')
  .description('升级到最新版本')
  .action(async () => {
    try {
      const upgradeCommand = require('./commands/upgrade');
      await upgradeCommand();
    } catch (error) {
      console.error(chalk.red('❌ 升级失败:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
