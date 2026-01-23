/**
 * 用户交互处理
 *
 * 处理 CLI/MCP 模式的用户输入和确认，集成 inquirer 和 chalk
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { DecisionType } from './types';

/**
 * 用户交互处理器
 */
export class UserInteractionHandler {
  
  /**
   * 读取用户输入
   */
  async readInput(message: string, defaultValue?: string): Promise<string> {
    const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: chalk.blue(message),
        default: defaultValue
      }
    ]);
    return answer;
  }

  /**
   * 确认操作 (Yes/No)
   */
  async confirm(message: string, defaultValue: boolean = true): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: chalk.yellow(message),
        default: defaultValue
      }
    ]);
    return confirmed;
  }

  /**
   * 从列表选择
   */
  async select(message: string, choices: string[], defaultValue?: string): Promise<string> {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: chalk.cyan(message),
        choices,
        default: defaultValue
      }
    ]);
    return selected;
  }

  /**
   * 确认决策 (Orchestrator transition)
   */
  async confirmInteraction(
    type: DecisionType,
    summary: string,
    details: string
  ): Promise<boolean> {
    console.log(chalk.bold.white('\n📋 决策确认'));
    console.log(chalk.gray('----------------------------------------'));
    console.log(chalk.bold('类型:'), type);
    console.log(chalk.bold('摘要:'), summary);
    console.log(chalk.bold('详情:'));
    console.log(chalk.gray(details));
    console.log(chalk.gray('----------------------------------------\n'));

    return this.confirm('是否确认执行此操作？');
  }

  /**
   * 高风险确认
   */
  async confirmHighRisk(
    operation: string,
    filePath: string
  ): Promise<boolean> {
    console.log(chalk.bold.red('\n⚠️  高风险操作警告'));
    console.log(chalk.gray('----------------------------------------'));
    console.log(chalk.red(`操作: ${operation}`));
    console.log(chalk.red(`文件: ${filePath}`));
    console.log(chalk.gray('----------------------------------------\n'));

    return this.confirm(chalk.red('这是一个不可逆的操作。确认要继续吗？'), false);
  }

  /**
   * 处理 Analyst 的追问
   */
  async handleAnalystQuestion(question: any): Promise<string> {
    console.log(chalk.blue(`\n🤔 追问: ${question.question}`));
    
    if (question.options && question.options.length > 0) {
      return this.select('请选择:', question.options, question.default);
    } else {
      return this.readInput('请输入答案:', question.default);
    }
  }
}
