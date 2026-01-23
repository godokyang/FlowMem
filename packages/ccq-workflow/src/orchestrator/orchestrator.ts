/**
 * Orchestrator 主状态机
 *
 * 实现 25 个状态的工作流状态机，控制 Agent 调用和阶段转换
 */

import { OrchestratorConfig, WorkflowPhase, StateMetadata } from './types';
import { TransitionRule, getTransitions } from './transitions';
import { AgentRegistry } from '../agents';
import { MemoryManager } from '../memory';
import { RetrieverFactory } from '../context';
import { UserInteractionHandler } from './user-interaction';
import chalk from 'chalk';

/**
 * Orchestrator 主类
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private currentState: WorkflowPhase = 'init';
  private stateMetadata: StateMetadata = {
    phase: 'init',
    timestamp: new Date().toISOString(),
    data: {}
  };
  private ui: UserInteractionHandler;
  private contextRetriever: any = null;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.ui = new UserInteractionHandler();
  }

  /**
   * 获取当前状态
   */
  getCurrentPhase(): WorkflowPhase {
    return this.currentState;
  }

  /**
   * 获取状态元数据
   */
  getStateMetadata(): StateMetadata {
    return this.stateMetadata;
  }

  /**
   * 初始化 Orchestrator
   */
  async initialize(): Promise<void> {
    console.log(chalk.gray('[Orchestrator] 初始化中...'));

    await this.config.memoryManager.updateCoreMemory({});

    // 使用注入的 contextRetrieverFactory 创建检索器
    this.contextRetriever = await RetrieverFactory.create(this.config.projectRoot);

    console.log(chalk.green('[Orchestrator] 初始化完成'));
  }

  /**
   * 执行工作流
   */
  async runWorkflow(request: string): Promise<void> {
    console.log(chalk.bold.blue(`\n======== FlowMem Workflow ========`));
    console.log(chalk.bold('需求:'), request);
    console.log(chalk.bold.blue(`==================================\n`));

    await this.initialize();

    await this.transitionTo('phase1.start', { request });

    await this.phase1(request);

    await this.transitionTo('phase2.planner_start', { 
      chosenPlan: '',
      coreMemory: this.config.memoryManager.getCoreMemory()
    });

    await this.phase2();

    await this.transitionTo('phase3.start', { todoList: null });

    await this.phase3();

    // 进入 Phase 4
    await this.transitionTo('phase4.start', {});

    await this.phase4();

    await this.transitionTo('completed', {});

    console.log(chalk.bold.green(`\n======== 工作流完成 ========`));
  }

  /**
   * 恢复中断的工作流
   */
  async resumeWorkflow(): Promise<void> {
    console.log(chalk.bold.blue(`\n======== FlowMem Workflow (Resume) ========`));

    await this.initialize();

    const savedState = await this.config.memoryManager.loadState();
    if (!savedState) {
      console.error(chalk.red('未找到可恢复的工作流状态'));
      return;
    }

    console.log(chalk.green(`已加载状态: ${savedState.phase} (${savedState.timestamp})`));
    
    this.currentState = savedState.phase;
    this.stateMetadata = savedState;

    // 根据当前状态跳转到对应的处理逻辑
    if (this.currentState.startsWith('phase1.')) {
      const request = this.stateMetadata.data?.request;
      if (!request) {
        console.error(chalk.red('状态数据缺失：未找到 request'));
        return;
      }
      await this.phase1(request);
    } else if (this.currentState.startsWith('phase2.')) {
      await this.phase2();
    } else if (this.currentState.startsWith('phase3.')) {
      await this.phase3();
    } else {
      console.log(chalk.yellow('工作流已完成或处于未知状态'));
    }

    console.log(chalk.bold.green(`\n======== 工作流完成 ========`));
  }

  /**
   * Phase 1: 需求澄清与技术方案
   */
  private async phase1(request: string): Promise<void> {
    console.log(chalk.yellow('\n[Phase 1] 需求澄清与技术方案'));

    const codeContext = await this.retrieveCodeContext();

    await this.transitionTo('phase1.code_retrieval', { codeContext });

    await this.transitionTo('phase1.analyst_scoring', {});

    const clarifiedRequirements: string[] = [];
    const maxIterations = 3;

    for (let i = 0; i < maxIterations; i++) {
      const analystResult = await this.config.agentRegistry.call('analyst', {
        request: request,
        constraints: codeContext?.constraints || [],
        previousClarifications: clarifiedRequirements,
        coreMemory: this.config.memoryManager.getCoreMemory()
      });

      // 如果评分低于 7 分或有追问，则进行追问
      if (analystResult.score < 7 || analystResult.questions.length > 0) {
        console.log(chalk.yellow(`[Phase 1] 需求不清晰，需要追问。Score: ${analystResult.score}`));

        // 遍历所有问题进行追问
        for (const question of analystResult.questions) {
          const userAnswer = await this.ui.handleAnalystQuestion(question);

          if (userAnswer) {
            // 记录问题和用户回答
            clarifiedRequirements.push(`Q: ${question.question}`);
            clarifiedRequirements.push(`A: ${userAnswer}`);
          } else {
            console.log(chalk.gray('[Phase 1] 用户跳过追问'));
          }
        }

        await this.transitionTo('phase1.analyst_scoring', {});
      } else {
        // 评分达标且无追问，退出循环
        console.log(chalk.green(`[Phase 1] 需求清晰度达标。Score: ${analystResult.score}`));
        break;
      }
    }

    await this.transitionTo('phase1.solver_design', { clarifiedRequirements });

    // Solver + Critic 迭代机制
    let solverResult: any;
    let criticResult: any;
    const maxSolverIterations = 3;
    let solverIteration = 0;

    while (solverIteration < maxSolverIterations) {
      console.log(chalk.blue(`[Phase 1] Solver 设计方案 (迭代 ${solverIteration + 1}/${maxSolverIterations})`));

      solverResult = await this.config.agentRegistry.call('solver', {
        request: request,
        constraints: codeContext?.constraints || [],
        previousSolution: solverIteration > 0 ? solverResult?.solution : null,
        criticFeedback: solverIteration > 0 ? criticResult?.issues : null,
        coreMemory: this.config.memoryManager.getCoreMemory()
      });

      this.stateMetadata.data!.solution = solverResult.solution;

      await this.transitionTo('phase1.critic_review', { criticIssues: [] });

      console.log(chalk.blue(`[Phase 1] Critic 审核方案 (迭代 ${solverIteration + 1}/${maxSolverIterations})`));

      criticResult = await this.config.agentRegistry.call('critic', {
        solution: solverResult.solution,
        requirement: request,
        constraints: codeContext?.constraints || [],
        coreMemory: this.config.memoryManager.getCoreMemory()
      });

      if (criticResult.passed) {
        console.log(chalk.green('[Phase 1] 方案通过 Critic 审核'));
        break;
      } else {
        console.log(chalk.yellow(`[Phase 1] 方案需要修改。Issues: ${criticResult.issues.length}`));
        solverIteration++;

        if (solverIteration >= maxSolverIterations) {
          console.log(chalk.yellow('[Phase 1] 已达到最大迭代次数，使用当前方案'));
        }
      }
    }

    await this.transitionTo('phase1.solution_confirm', {
      solution: solverResult.solution,
      planScore: criticResult.confidence || 7
    });
  }

  /**
   * Phase 2: 任务规划
   */
  private async phase2(): Promise<void> {
    console.log(chalk.yellow('\n[Phase 2] 任务规划'));

    const plannerResult = await this.config.agentRegistry.call('planner', {
      requirement: this.stateMetadata.data!.request as string,
      chosenPlan: this.stateMetadata.data!.chosenPlan as string,
      coreMemory: this.config.memoryManager.getCoreMemory()
    });

    this.stateMetadata.data!.plannerOutput = plannerResult;

    console.log(chalk.green(`[Phase 2] TodoList 已生成，共 ${plannerResult.todolist.todos.length} 个任务`));
    console.log(`总工作量: ${plannerResult.todolist.meta.totalPoints} 点`);
    console.log(`预计时间: ${plannerResult.todolist.meta.estimatedHours} 小时`);
  }

  /**
   * Phase 3: 代码实现
   */
  private async phase3(): Promise<void> {
    console.log(chalk.yellow('\n[Phase 3] 代码实现'));

    const todolist = this.stateMetadata.data!.plannerOutput;

    if (!todolist || !todolist.todos || todolist.todos.length === 0) {
      console.error(chalk.red('[Phase 3] 无 TodoList，无法执行代码实现'));
      return;
    }

    let nextTodo = this.getNextPendingTodo(todolist);

    while (nextTodo) {
      console.log(chalk.blue(`[Phase 3] 执行任务: ${nextTodo.id} - ${nextTodo.content}`));

      const contextResult = await this.retrieveCodeContext(nextTodo);

      // Coder + Reviewer 迭代机制
      let coderResult: any;
      let reviewerResult: any;
      const maxCoderIterations = 3;
      let coderIteration = 0;

      while (coderIteration < maxCoderIterations) {
        console.log(chalk.blue(`[Phase 3] Coder 实现代码 (迭代 ${coderIteration + 1}/${maxCoderIterations})`));

        await this.transitionTo('phase3.coder_implementation', {
          todoItem: nextTodo,
          context: contextResult?.chunks || []
        });

        coderResult = await this.config.agentRegistry.call('coder', {
          todo: nextTodo,
          context: contextResult?.chunks || [],
          previousChanges: coderIteration > 0 ? coderResult?.changes : null,
          reviewerFeedback: coderIteration > 0 ? reviewerResult?.issues : null,
          coreMemory: this.config.memoryManager.getCoreMemory()
        });

        this.stateMetadata.data!.coderOutput = coderResult;

        console.log(chalk.blue(`[Phase 3] Reviewer 审核代码 (迭代 ${coderIteration + 1}/${maxCoderIterations})`));

        await this.transitionTo('phase3.reviewer_audit', {
          todoId: nextTodo.id,
          changes: coderResult.changes,
          acceptanceCriteria: nextTodo.acceptance,
          coreMemory: this.config.memoryManager.getCoreMemory()
        });

        reviewerResult = await this.config.agentRegistry.call('reviewer', {
          todo: nextTodo,
          changes: coderResult.changes,
          acceptanceCriteria: nextTodo.acceptance,
          coreMemory: this.config.memoryManager.getCoreMemory()
        });

        this.stateMetadata.data!.reviewerOutput = reviewerResult;

        if (reviewerResult.passed) {
          console.log(chalk.green(`[Phase 3] 任务完成并通过审核: ${nextTodo.id}`));
          break;
        } else {
          console.log(chalk.yellow(`[Phase 3] 审核未通过，需要修复。Issues: ${reviewerResult.issues.length}`));
          coderIteration++;

          if (coderIteration >= maxCoderIterations) {
            console.log(chalk.yellow('[Phase 3] 已达到最大迭代次数，标记任务为 blocked'));
            nextTodo.status = 'blocked';
            await this.config.memoryManager.updateTodoStatus(nextTodo.id, 'blocked');
            break;
          }
        }
      }

      // 只有通过审核的任务才标记为 completed
      if (reviewerResult.passed) {
        nextTodo.status = 'completed';
        await this.config.memoryManager.updateTodoStatus(nextTodo.id, 'completed');
      }

      nextTodo = this.getNextPendingTodo(todolist);
    }

    await this.transitionTo('completed', {});
  }

  /**
   * Phase 4: 最终审查、测试、交付报告
   */
  private async phase4(): Promise<void> {
    console.log(chalk.yellow('\n[Phase 4] 最终审查与测试'));

    // 生成交付报告
    await this.generateDeliveryReport();

    // 执行测试（如果有）
    const testResults = await this.runTests();

    await this.transitionTo('phase4.test_execution', { testResults });

    if (testResults.passed) {
      console.log(chalk.green('[Phase 4] 所有测试通过'));
    } else {
      console.log(chalk.yellow(`[Phase 4] 部分测试失败: ${testResults.failedCount}/${testResults.totalCount}`));
    }

    await this.transitionTo('phase4.test_complete', {});

    console.log(chalk.green('[Phase 4] 最终审查完成'));
  }

  /**
   * 生成交付报告
   */
  private async generateDeliveryReport(): Promise<void> {
    const coreMemory = this.config.memoryManager.getCoreMemory();
    const plannerOutput = this.stateMetadata.data?.plannerOutput;

    if (!plannerOutput) {
      console.warn(chalk.yellow('[Phase 4] 无 Planner 输出，跳过报告生成'));
      return;
    }

    const todolist = plannerOutput.todolist;
    const completedTodos = todolist.todos.filter((t: any) => t.status === 'completed');
    const blockedTodos = todolist.todos.filter((t: any) => t.status === 'blocked');

    const report = `# 交付报告

## 需求概述

${coreMemory.requirement}

## 完成情况

- **总任务数**: ${todolist.todos.length}
- **已完成**: ${completedTodos.length}
- **被阻塞**: ${blockedTodos.length}
- **完成率**: ${Math.round((completedTodos.length / todolist.todos.length) * 100)}%

## 已完成任务

${completedTodos.map((t: any) => `- ✅ ${t.id}: ${t.content}`).join('\n')}

${blockedTodos.length > 0 ? `## 被阻塞任务

${blockedTodos.map((t: any) => `- 🚫 ${t.id}: ${t.content}`).join('\n')}` : ''}

## 技术方案

${coreMemory.chosenPlan}

## 生成时间

${new Date().toISOString()}
`;

    // 保存报告
    const reportPath = `${this.config.projectRoot}/.agentmem/delivery-report.md`;
    const fs = await import('fs/promises');
    await fs.writeFile(reportPath, report);

    console.log(chalk.green(`[Phase 4] 交付报告已生成: ${reportPath}`));
  }

  /**
   * 运行测试
   */
  private async runTests(): Promise<{ passed: boolean; totalCount: number; failedCount: number }> {
    console.log(chalk.blue('[Phase 4] 执行测试...'));

    // 简化实现：尝试运行 npm test
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('npm test', { cwd: this.config.projectRoot });

      return {
        passed: true,
        totalCount: 1,
        failedCount: 0
      };
    } catch (error) {
      console.log(chalk.yellow('[Phase 4] 测试执行失败或未配置测试'));

      return {
        passed: false,
        totalCount: 1,
        failedCount: 1
      };
    }
  }

  /**
   * 辅助方法：检索代码上下文
   */
  private async retrieveCodeContext(filters?: any): Promise<any> {
    // 使用已初始化的 contextRetriever
    if (!this.contextRetriever) {
      console.warn(chalk.yellow('[Orchestrator] 检索器未初始化，尝试创建...'));
      this.contextRetriever = await RetrieverFactory.create(this.config.projectRoot);
    }

    try {
      const fileFilters = filters?.files || [];

      // 构建更智能的检索 query
      let queryText = '';
      if (fileFilters.length > 0) {
        // 如果有文件过滤器，使用文件名作为 query
        queryText = fileFilters.join(' ');
      } else if (filters?.content) {
        // 如果有内容描述，使用内容作为 query
        queryText = filters.content;
      } else {
        // 使用需求描述作为 query
        const coreMemory = this.config.memoryManager.getCoreMemory();
        queryText = coreMemory.requirement || 'relevant code';
      }

      const result = await this.contextRetriever.retrieve({
        text: queryText,
        maxTokens: 4000,
        fileFilters: fileFilters
      });

      console.log(chalk.gray(`[Orchestrator] 检索到 ${result.chunks.length} 个代码片段`));

      return result;
    } catch (error) {
      console.error(chalk.red('[Orchestrator] 代码检索失败:'), error);
      return { chunks: [], constraints: [] };
    }
  }

  /**
   * 辅助方法：获取下一个待执行 Todo
   */
  private getNextPendingTodo(todolist: any): any {
    for (const layer of todolist.executionOrder) {
      for (const todoId of layer) {
        const todo = todolist.todos.find((t: any) => t.id === todoId);
        if (todo && todo.status === 'pending') {
          const depsMet = todo.dependsOn.every((depId: string) => {
            const depTodo = todolist.todos.find((t: any) => t.id === depId);
            return depTodo && depTodo.status === 'completed';
          });

          if (depsMet) {
            return todo;
          }
        }
      }
    }

    return null;
  }

  /**
   * 状态转换
   */
  private async transitionTo(targetPhase: WorkflowPhase, data?: Record<string, any>): Promise<void> {
    const transitions = getTransitions(this.currentState);
    const validTransitions = transitions.filter(t => t.toPhase === targetPhase);

    if (validTransitions.length === 0) {
      throw new Error(`[Orchestrator] 无效的状态转换: ${this.currentState} -> ${targetPhase}`);
    }

    if (validTransitions.length > 1) {
      console.warn(chalk.yellow(`[Orchestrator] 发现多个可能的转换，将使用第一个`));
    }

    const transition = validTransitions[0];

    if (transition.requiresConfirmation) {
      console.log(chalk.cyan(`[Orchestrator] 需要用户确认: ${transition.toPhase}`));

      // 使用 UI Handler 进行确认
      const confirmed = await this.ui.confirm(`确认状态转换到 ${transition.toPhase}?`);

      if (!confirmed) {
        throw new Error('用户取消操作');
      }
    }

    if (transition.requiresData) {
      const currentData = { ...this.stateMetadata.data, ...data };
      const missingData: string[] = [];

      for (const key of transition.requiresData) {
        if (!(key in currentData)) {
          missingData.push(key);
        }
      }

      if (missingData.length > 0) {
        throw new Error(`缺少必需数据: ${missingData.join(', ')}`);
      }
    }

    console.log(chalk.gray(`[Orchestrator] 状态转换: ${this.currentState} -> ${transition.toPhase}`));
    this.currentState = transition.toPhase;
    this.stateMetadata.phase = transition.toPhase;
    this.stateMetadata.timestamp = new Date().toISOString();

    if (data) {
      Object.keys(data).forEach(key => {
        this.stateMetadata.data![key] = data[key];
      });
    }

    // 保存状态
    await this.config.memoryManager.saveState(this.stateMetadata);

    // 触发回调
    if (this.config.onStateChange) {
      this.config.onStateChange(this.stateMetadata);
    }
  }
}
