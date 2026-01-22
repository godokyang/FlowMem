#!/usr/bin/env node

const { program } = require('commander');

const registerCommands = async () => {
  const { 
    initCommand,
    indexCommand, 
    contextCommand, 
    askCommand, 
    statusCommand,
    exportCommand,
    importCommand,
    addRemoteCommand,
    installHooksCommand
  } = await import('../dist/cli/commands.js');

  program
    .name('ccq')
    .description('Codebase Context Query Engine')
    .addCommand(initCommand)
    .addCommand(indexCommand)
    .addCommand(contextCommand)
    .addCommand(askCommand)
    .addCommand(statusCommand)
    .addCommand(exportCommand)
    .addCommand(importCommand)
    .addCommand(addRemoteCommand)
    .addCommand(installHooksCommand);

  await program.parseAsync(process.argv);
};

registerCommands().catch(console.error);
