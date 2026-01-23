/**
 * Analyst Agent 实现
 *
 * 负责需求分析、完整性评分、追问生成
 */

import { BaseAgent } from './base';
import { LLMClient } from '../llm/client';
import {
  AnalystInput,
  AnalystOutput,
  ClarificationQuestion
} from './types';

export class AnalystAgent extends BaseAgent<AnalystInput, AnalystOutput> {
  name = 'analyst';

  constructor(llmClient: LLMClient) {
    super(llmClient);
  }

  buildPrompt(input: AnalystInput): string {
    return `
# 角色：需求分析师

你是一位资深需求分析师，负责评估用户需求的完整性，识别缺失信息并生成针对性追问。

## 方法论（Lyra 4-D）

1. **DECONSTRUCT（解构）**: 提取用户意图、关键实体、上下文
2. **DIAGNOSE（诊断）**: 评估清晰度、完整性、具体性
3. **DEVELOP（生成追问）**: 针对缺失信息生成 2-3 个具体问题
4. **DELIVER（输出评分）**: 输出评分和问题清单

## 输入

### 用户需求
${input.request}

### 项目约束
${input.constraints?.map(c => `- ${c}`).join('\n') || '无已知约束'}

${input.previousClarifications ? `### 用户补充说明\n${input.previousClarifications.join('\n')}` : ''}

## 评分维度

| 维度 | 分值 | 评估标准 |
|------|------|----------|
| 目标明确性 | 0-3 | 是否清楚要实现什么功能？ |
| 预期结果 | 0-3 | 是否明确成功的标准？ |
| 边界范围 | 0-2 | 是否清楚包含/不包含什么？ |
| 约束条件 | 0-2 | 是否了解技术/业务限制？ |

## 复杂度判断

- **低**: ≤2 文件、无跨模块
- **中**: 3-5 文件或 1 个跨模块
- **高**: >5 文件或含新 API/迁移/权限

## 追问策略

- **针对性**: 问具体问题，不要泛泛而问
- **智能默认**: 有些信息可以推断，不必事事都问
- **限制数量**: 最多 3 个问题
- **提供选项**: 给出选项比开放式问题更易回答

## 输出格式（JSON）

\`\`\`json
{
  "score": 7,
  "complexity": "medium",
  "summarizedRequirement": "实现用户登录功能，使用 JWT 认证",
  "clarifiedPoints": [
    "目标：用户登录功能",
    "认证方式：JWT"
  ],
  "unclearPoints": [
    "是否需要前端页面",
    "是否需要注册功能"
  ],
  "questions": [
    {
      "dimension": "boundary",
      "question": "这次只做后端 API，还是包含前端登录页面？",
      "options": ["仅后端 API", "包含前端页面", "全栈"],
      "default": "仅后端 API"
    }
  ]
}
\`\`\`

请分析上述需求并输出 JSON。
`.trim();
  }

  parseOutput(rawOutput: string): AnalystOutput {
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Analyst 输出格式错误：未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      score: parsed.score,
      complexity: parsed.complexity,
      summarizedRequirement: parsed.summarizedRequirement,
      clarifiedPoints: parsed.clarifiedPoints || [],
      unclearPoints: parsed.unclearPoints || [],
      questions: parsed.questions || []
    };
  }
}
