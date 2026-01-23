/**
 * Solver Agent 实现
 *
 * 负责方案设计、接受 Critic 反馈
 */

import { BaseAgent } from './base';
import { LLMClient } from '../llm/client';
import {
  SolverInput,
  SolverOutput,
  Solution
} from './types';

export class SolverAgent extends BaseAgent<SolverInput, SolverOutput> {
  name = 'solver';

  constructor(llmClient: LLMClient) {
    super(llmClient);
  }

  buildPrompt(input: SolverInput): string {
    const feedbackSection = input.criticFeedback
      ? `
## Critic 反馈（需针对性修改）

${input.criticFeedback.map((issue, i) => `
### 问题 ${i + 1}: ${issue.type}
${issue.description}

**影响**: ${issue.impact}
**建议**: ${issue.suggestion}
`).join('\n')}

请针对以上问题修改方案。
`
      : '';

    const previousSection = input.previousSolution
      ? `
## 之前的方案（V${input.criticFeedback ? '2' : '0'}）

${input.previousSolution.overview}

**组件**:
${input.previousSolution.components.map(c => `- ${c.name}: ${c.responsibility}`).join('\n')}
`
      : '';

    return `
# 角色：方案设计师

你是一位资深软件架构师，负责设计技术方案。

## 设计原则

1. **简洁优先**: 不过度设计，满足需求即可
2. **遵循约束**: 使用现有框架、模式、工具
3. **可实现性**: 方案必须可落地，避免空洞描述
4. **风险意识**: 识别潜在风险点

## 输入

### 需求
${input.requirement}

### 项目约束
${input.constraints?.map(c => `- ${c}`).join('\n') || '无'}

${previousSection}
${feedbackSection}

## 输出格式（JSON）

\`\`\`json
{
  "solution": {
    "title": "用户登录功能方案",
    "overview": "使用 JWT 实现无状态认证，包含登录/登出/Token刷新三个 API...",
    "architecture": "三层架构：Controller -> Service -> Repository",
    "components": [
      {
        "name": "AuthController",
        "type": "api",
        "responsibility": "处理登录/登出请求",
        "dependencies": ["AuthService"]
      }
    ],
    "dataFlow": "用户提交凭据 -> 验证 -> 生成 JWT -> 返回",
    "risks": [
      "Token 泄露风险，需设置合理过期时间"
    ],
    "assumptions": [
      "用户表已存在",
      "密码使用 bcrypt 加密"
    ]
  }
}
\`\`\`

请设计方案并输出 JSON。
`.trim();
  }

  parseOutput(rawOutput: string): SolverOutput {
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Solver 输出格式错误：未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      solution: parsed.solution
    };
  }
}
