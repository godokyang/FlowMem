/**
 * Memory Manager
 *
 * MVP1 skeleton implementation - full features in later phases
 */

import * as path from 'path';
import { CoreMemory, PhaseMemory, TraceLogEntry, DecisionLog } from './types';
import { LLMClient } from '../llm/client';
import * as fs from 'fs/promises';

export class MemoryManager {
  private readonly agentmemDir: string;
  private coreMemory: CoreMemory;
  private phaseMemory: PhaseMemory;
  private llmClient: LLMClient;

  constructor(projectRoot: string, llmClient: LLMClient) {
    this.agentmemDir = path.join(projectRoot, '.agentmem');
    this.llmClient = llmClient;
    this.coreMemory = this.createEmptyCoreMemory();
    this.phaseMemory = { phase: 'init', startTime: new Date() };
  }

  createEmptyCoreMemory(): CoreMemory {
    return {
      requirement: '',
      acceptanceCriteria: [],
      constraints: [],
      chosenPlan: '',
      currentTodo: undefined
    };
  }

  getCoreMemory(): CoreMemory {
    return { ...this.coreMemory };
  }

  updateCoreMemory(updates: Partial<CoreMemory>): void {
    this.coreMemory = { ...this.coreMemory, ...updates };
  }

  async saveCoreMemory(): Promise<void> {
    const coreMemoryPath = path.join(this.agentmemDir, 'core.json');
    await this.ensureAgentmemDir();
    await fs.writeFile(coreMemoryPath, JSON.stringify(this.coreMemory, null, 2));

    // 同时生成 request.md
    const requestMdPath = path.join(this.agentmemDir, 'request.md');
    const requestMdContent = `# 需求描述

${this.coreMemory.requirement}

## 验收标准

${this.coreMemory.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 约束条件

${this.coreMemory.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 选定方案

${this.coreMemory.chosenPlan}
`;
    await fs.writeFile(requestMdPath, requestMdContent);
  }

  async saveState(metadata: import('../orchestrator/types').StateMetadata): Promise<void> {
    this.phaseMemory.stateMetadata = metadata;
    const statePath = path.join(this.agentmemDir, 'state.json');
    await this.ensureAgentmemDir();
    await fs.writeFile(statePath, JSON.stringify(metadata, null, 2));
  }

  async loadState(): Promise<import('../orchestrator/types').StateMetadata | null> {
    const statePath = path.join(this.agentmemDir, 'state.json');
    try {
      const content = await fs.readFile(statePath, 'utf-8');
      const metadata = JSON.parse(content);
      this.phaseMemory.stateMetadata = metadata;
      return metadata;
    } catch {
      return null;
    }
  }

  getPhaseMemory(): PhaseMemory {
    return { ...this.phaseMemory };
  }

  updatePhaseMemory(updates: Partial<PhaseMemory>): void {
    this.phaseMemory = { ...this.phaseMemory, ...updates };
  }

  startPhase(phase: import('./types').WorkflowPhase): void {
    this.phaseMemory.phase = phase;
    this.phaseMemory.startTime = new Date();
  }

  async appendTraceLog(entry: TraceLogEntry): Promise<void> {
    const traceLogPath = path.join(this.agentmemDir, 'trace.log');
    await this.ensureAgentmemDir();

    const logLine = `[${entry.timestamp}] ${entry.phase} - ${entry.event}: ${JSON.stringify(entry.data || {})}\n`;
    await fs.appendFile(traceLogPath, logLine);
  }

  async logDecision(decision: Omit<DecisionLog, 'id' | 'timestamp'>): Promise<void> {
    const decisionLogPath = path.join(this.agentmemDir, 'decisions.json');
    await this.ensureAgentmemDir();

    const fullDecision: DecisionLog = {
      ...decision,
      id: `decision-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // 读取现有决策日志
    let decisions: DecisionLog[] = [];
    try {
      const content = await fs.readFile(decisionLogPath, 'utf-8');
      decisions = JSON.parse(content);
    } catch {
      // 文件不存在或为空
    }

    decisions.push(fullDecision);
    await fs.writeFile(decisionLogPath, JSON.stringify(decisions, null, 2));
  }

  async updateTodoStatus(todoId: string, status: 'pending' | 'in_progress' | 'completed' | 'blocked'): Promise<void> {
    // 更新 phaseMemory 中的 todolist
    if (this.phaseMemory.data && this.phaseMemory.data.todolist) {
      const todolist = this.phaseMemory.data.todolist;
      const todo = todolist.todos.find((t: any) => t.id === todoId);

      if (todo) {
        todo.status = status;
      }
    }

    // 更新 stateMetadata 中的 plannerOutput（如果存在）
    if (this.phaseMemory.stateMetadata?.data?.plannerOutput) {
      const plannerOutput = this.phaseMemory.stateMetadata.data.plannerOutput;
      const todo = plannerOutput.todolist?.todos?.find((t: any) => t.id === todoId);

      if (todo) {
        todo.status = status;
      }
    }

    // 保存 todolist.md
    await this.saveTodoListMd();
  }

  /**
   * 保存 todolist.md
   */
  private async saveTodoListMd(): Promise<void> {
    const todolistMdPath = path.join(this.agentmemDir, 'todolist.md');
    await this.ensureAgentmemDir();

    const plannerOutput = this.phaseMemory.stateMetadata?.data?.plannerOutput;
    if (!plannerOutput || !plannerOutput.todolist) {
      return;
    }

    const todolist = plannerOutput.todolist;
    let content = `# TodoList

**总工作量**: ${todolist.meta.totalPoints} 点
**预计时间**: ${todolist.meta.estimatedHours} 小时

## 任务列表

`;

    for (const todo of todolist.todos) {
      const statusIcon: Record<string, string> = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        blocked: '🚫'
      };

      const icon = statusIcon[todo.status] || '❓';

      content += `### ${icon} ${todo.id}: ${todo.content}

**状态**: ${todo.status}
**工作量**: ${todo.points} 点
**涉及文件**: ${todo.files.join(', ')}
**依赖**: ${todo.dependsOn.length > 0 ? todo.dependsOn.join(', ') : '无'}

**验收条件**:
${todo.acceptance.map((a: string) => `- ${a}`).join('\n')}

---

`;
    }

    await fs.writeFile(todolistMdPath, content);
  }

  private async ensureAgentmemDir(): Promise<void> {
    try {
      await fs.mkdir(this.agentmemDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }
}
