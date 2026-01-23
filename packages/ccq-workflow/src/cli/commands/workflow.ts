/**
 * CLI Workflow 命令
 */

import { Command } from 'commander';
import { Orchestrator } from '../../orchestrator';
import { MemoryManager } from '../../memory';
import { LLMClient } from '../../llm';
import { AgentRegistry } from '../../agents';
import { RetrieverFactory } from '../../context';
import ora from 'ora';
import chalk from 'chalk';

export const workflowCommands = new Command('workflow')
  .description('工作流管理命令');

workflowCommands.command('start')
  .description('开始一个新的工作流')
  .argument('<request>', '工作流需求描述')
  .option('-d, --debug', '开启调试模式')
  .action(async (request, options) => {
    const spinner = ora('初始化工作流...').start();

    try {
      const projectRoot = process.cwd();
      const llmClient = new LLMClient({});
      const memoryManager = new MemoryManager(projectRoot, llmClient);
      const agentRegistry = new AgentRegistry(llmClient);
      const retrieverFactory = new RetrieverFactory();

      const orchestrator = new Orchestrator({
        projectRoot,
        llmClient,
        agentRegistry,
        memoryManager,
        contextRetrieverFactory: retrieverFactory as any,
        debugMode: options.debug,
        onStateChange: (state) => {
          spinner.succeed(chalk.green(`完成阶段: ${state.phase}`));
          spinner.start(chalk.cyan(`进入阶段: ${state.phase}...`));
        }
      });

      spinner.succeed('初始化完成');
      await orchestrator.runWorkflow(request);
      spinner.succeed('工作流执行完成');
    } catch (error) {
      spinner.fail('工作流执行失败');
      console.error(error);
      process.exit(1);
    }
  });

workflowCommands.command('resume')
  .description('恢复中断的工作流')
  .option('-d, --debug', '开启调试模式')
  .action(async (options) => {
    const spinner = ora('正在加载工作流状态...').start();

    try {
      const projectRoot = process.cwd();
      const llmClient = new LLMClient({});
      const memoryManager = new MemoryManager(projectRoot, llmClient);
      const agentRegistry = new AgentRegistry(llmClient);
      const retrieverFactory = new RetrieverFactory();

      const orchestrator = new Orchestrator({
        projectRoot,
        llmClient,
        agentRegistry,
        memoryManager,
        contextRetrieverFactory: retrieverFactory as any,
        debugMode: options.debug,
        onStateChange: (state) => {
          spinner.succeed(chalk.green(`完成阶段: ${state.phase}`));
          spinner.start(chalk.cyan(`进入阶段: ${state.phase}...`));
        }
      });

      spinner.succeed('状态加载完成');
      await orchestrator.resumeWorkflow();
      spinner.succeed('工作流执行完成');
    } catch (error) {
      spinner.fail('工作流恢复失败');
      console.error(error);
      process.exit(1);
    }
  });
