/**
 * Agent 注册表
 */

import {
  Agent,
  AgentInput,
  AgentOutput
} from './types';
import { LLMClient } from '../llm/client';
import { AnalystAgent } from './analyst';
import { SolverAgent } from './solver';
import { CriticAgent } from './critic';
import { PlannerAgent } from './planner';
import { CoderAgent } from './coder';
import { ReviewerAgent } from './reviewer';

// 由于 Solver、Critic、Planner、Coder 还未实现，先声明
type AgentType = Agent<any, any>;

/**
 * Agent 注册表
 *
 * 管理所有 Agent 的注册和调用
 */
export class AgentRegistry {
  private agents: Map<string, AgentType> = new Map();
  private llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
    // 注册所有内置 Agent
    this.registerBuiltinAgents();
  }

  /**
   * 注册所有内置 Agent
   */
  private registerBuiltinAgents(): void {
    this.register(new AnalystAgent(this.llmClient));
    this.register(new SolverAgent(this.llmClient));
    this.register(new CriticAgent(this.llmClient));
    this.register(new PlannerAgent(this.llmClient));
    this.register(new CoderAgent(this.llmClient));
    this.register(new ReviewerAgent(this.llmClient));
  }

  /**
   * 注册 Agent
   */
  register<T extends AgentType>(agent: T): void {
    this.agents.set(agent.name, agent);
  }

  /**
   * 调用 Agent
   */
  async call<TInput extends AgentInput, TOutput extends AgentOutput>(
    agentName: string,
    input: TInput
  ): Promise<TOutput> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const startTime = Date.now();
    const result = await agent.execute(input);
    result.durationMs = Date.now() - startTime;

    return result as TOutput;
  }

  /**
   * 获取所有已注册的 Agent 名称
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 检查 Agent 是否已注册
   */
  hasAgent(agentName: string): boolean {
    return this.agents.has(agentName);
  }
}
