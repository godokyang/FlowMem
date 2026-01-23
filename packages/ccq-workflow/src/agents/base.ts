/**
 * Agent 基类
 */

import {
  Agent,
  AgentInput,
  AgentOutput,
  CoreMemory
} from './types';
import { LLMClient } from '../llm/client';
import { CompletionResponse } from '../llm/types';

/**
 * Agent 基类
 *
 * 提供 Agent 的通用实现，包括 LLM 调用、核心记忆格式化等
 */
export abstract class BaseAgent<TInput extends AgentInput, TOutput extends AgentOutput>
  implements Agent<TInput, TOutput> {

  abstract name: string;
  protected llmClient: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }

  /**
   * 构建 Prompt（子类实现）
   */
  abstract buildPrompt(input: TInput): string;

  /**
   * 解析 LLM 输出（子类实现）
   */
  abstract parseOutput(rawOutput: string): TOutput;

  /**
   * 执行 Agent
   */
  async execute(input: TInput): Promise<TOutput> {
    const prompt = this.buildPrompt(input);

    const response: CompletionResponse = await this.llmClient.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const parsedOutput = this.parseOutput(response.content);

    // 添加 token 统计和耗时
    parsedOutput.agent = this.name;
    parsedOutput.tokensUsed = {
      input: response.usage.input,
      output: response.usage.output
    };
    parsedOutput.durationMs = 0; // 子类可以在构建输出时设置

    return parsedOutput;
  }

  /**
   * 通用的核心记忆格式化
   */
  protected formatCoreMemory(memory: CoreMemory): string {
    if (!memory) return '';

    return `
## 核心记忆（跨阶段共享）

**需求摘要**: ${memory.requirement || '待确定'}

**验收标准**:
${memory.acceptanceCriteria?.map(c => `- ${c}`).join('\n') || '待确定'}

**项目约束**:
${memory.constraints?.map(c => `- ${c}`).join('\n') || '无'}

**选定方案**: ${memory.chosenPlan || '待确定'}
`.trim();
  }
}
