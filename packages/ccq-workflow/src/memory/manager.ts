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
    console.log('[Memory] Trace log:', entry);
  }

  async logDecision(decision: Omit<DecisionLog, 'id' | 'timestamp'>): Promise<void> {
    console.log('[Memory] Decision:', decision);
  }

  async updateTodoStatus(todoId: string, status: 'pending' | 'in_progress' | 'completed' | 'blocked'): Promise<void> {
    if (this.phaseMemory.data && this.phaseMemory.data.todolist) {
      const todolist = this.phaseMemory.data.todolist;
      const todo = todolist.todos.find((t: any) => t.id === todoId);

      if (todo) {
        todo.status = status;
      }
    }
  }

  private async ensureAgentmemDir(): Promise<void> {
    try {
      await fs.mkdir(this.agentmemDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }
}
