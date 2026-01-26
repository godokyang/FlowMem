#!/usr/bin/env node

const { program } = require('commander');

const registerCommands = async () => {
  const {
    initCommand,
    todoCommand,
    auditCommand,
    guardCommand,
    contextCommand,
    archiveCommand,
    buildAdaptersCommand
  } = await import('../dist/index.js');

  program
    .name('flowmem')
    .description('FlowMem Workflow - 四阶段工作流 + 多 Agent 架构 + 偷懒检测')
    .version('2.8.0')
    .addCommand(initCommand)
    .addCommand(todoCommand)
    .addCommand(auditCommand)
    .addCommand(guardCommand)
    .addCommand(contextCommand)
    .addCommand(archiveCommand)
    .addCommand(buildAdaptersCommand);

  await program.parseAsync(process.argv);
};

registerCommands().catch(console.error);
