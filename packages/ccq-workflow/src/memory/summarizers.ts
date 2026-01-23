/**
 * Memory 归纳器
 *
 * 负责阶段性归纳、Token 控制和核心记忆更新
 */

import { PhaseMemory, CoreMemory } from './types';
import { LLMClient } from '../llm/client';

export class MemorySummarizer {
  constructor(private llmClient: LLMClient) {}

  /**
   * 归纳阶段记忆到核心记忆
   */
  async summarizePhase(phaseMemory: PhaseMemory, currentCore: CoreMemory): Promise<CoreMemory> {
    const prompt = this.buildSummarizePrompt(phaseMemory, currentCore);

    const result = await this.llmClient.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const summary = this.parseSummary(result.content);
    
    return {
      ...currentCore,
      ...summary
    };
  }

  /**
   * 压缩长文本
   */
  async compressText(text: string, maxTokens: number = 500): Promise<string> {
    if (text.length < maxTokens * 4) return text;

    const prompt = `
请将以下文本压缩到约 ${maxTokens} 个 token，保留关键信息：

${text}
    `.trim();

    const result = await this.llmClient.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens
    });

    return result.content;
  }

  private buildSummarizePrompt(phaseMemory: PhaseMemory, currentCore: CoreMemory): string {
    return `
# 角色：记忆归纳员

请根据当前阶段的执行结果，更新项目的核心记忆。

## 当前阶段: ${phaseMemory.phase}

## 阶段数据:
${JSON.stringify(phaseMemory.data || {}, null, 2)}

## 当前核心记忆:
${JSON.stringify(currentCore, null, 2)}

## 任务
请分析阶段数据，提取关键信息更新核心记忆。
- 如果是 phase1，更新 requirement, constraints, chosenPlan
- 如果是 phase2，更新 plannerOutput (摘要)
- 如果是 phase3，更新已完成的任务列表

## 输出格式 (JSON)
{
  "requirement": "...",
  "constraints": ["..."],
  "chosenPlan": "...",
  "acceptanceCriteria": ["..."]
}
    `.trim();
  }

  private parseSummary(content: string): Partial<CoreMemory> {
    try {
      const match = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (match) {
        return JSON.parse(match[1]);
      }
      return JSON.parse(content);
    } catch {
      console.warn('[Summarizer] 解析归纳结果失败');
      return {};
    }
  }
}
