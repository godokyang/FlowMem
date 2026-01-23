/**
 * Critic Agent 实现
 *
 * 负责方案审核、问题清单
 */

import { BaseAgent } from './base';
import { LLMClient } from '../llm/client';
import {
  CriticInput,
  CriticOutput,
  CriticIssue
} from './types';

export class CriticAgent extends BaseAgent<CriticInput, CriticOutput> {
  name = 'critic';

  constructor(llmClient: LLMClient) {
    super(llmClient);
  }

  buildPrompt(input: CriticInput): string {
    return `
# 角色：方案审核员

你是一位严格的技术审核员，负责独立评审技术方案。

## 审核原则

1. **独立评判**: 只看方案本身，不考虑设计者的"意图"
2. **问题导向**: 重点找问题，但也要指出优点
3. **建设性反馈**: 每个问题都要给出改进建议
4. **严格但公平**: 不吹毛求疵，但不放过重大问题

## 审核清单

| 类别 | 检查项 | 说明 |
|------|--------|------|
| **方向正确性** | 是否解决了用户的真正问题？ | 方向错误比细节问题更严重 |
| **技术可行性** | 能否实现？有无技术障碍？ | 考虑现有代码库约束 |
| **完整性** | 是否覆盖边界情况和异常处理？ | 检查遗漏场景 |
| **风险点** | 有无性能/安全/兼容性隐患？ | 识别潜在问题 |
| **与现有代码兼容** | 是否与项目现有模式一致？ | 参考项目约束 |

## 输入

### 需求
${input.requirement}

### 项目约束
${input.constraints?.map(c => `- ${c}`).join('\n') || '无'}

### 待审核方案

**标题**: ${input.solution.title}

**概述**: ${input.solution.overview}

**架构**: ${input.solution.architecture}

**组件**:
${input.solution.components.map(c => `
- **${c.name}** (${c.type})
  - 职责: ${c.responsibility}
  - 依赖: ${c.dependencies.join(', ') || '无'}
`).join('\n')}

**数据流**: ${input.solution.dataFlow}

**已识别风险**: ${input.solution.risks.join(', ') || '无'}

**假设前提**: ${input.solution.assumptions.join(', ') || '无'}

## 输出格式（JSON）

\`\`\`json
{
  "passed": true,
  "confidence": 85,
  "issues": [
    {
      "type": "risk",
      "severity": "major",
      "description": "Token 刷新逻辑缺失",
      "impact": "用户长时间使用后需要重新登录",
      "suggestion": "增加 /auth/refresh 端点实现 Token 刷新"
    }
  ],
  "strengths": [
    "架构清晰，职责分离合理",
    "考虑了密码加密安全"
  ]
}
\`\`\`

## 通过标准

- 无 critical 问题
- major 问题 ≤ 2 个
- 整体方向正确

请审核方案并输出 JSON。
`.trim();
  }

  parseOutput(rawOutput: string): CriticOutput {
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Critic 输出格式错误：未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const hasCritical = parsed.issues?.some((i: CriticIssue) => i.severity === 'critical');
    const majorCount = parsed.issues?.filter((i: CriticIssue) => i.severity === 'major').length || 0;

    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      passed: !hasCritical && majorCount <= 2 && parsed.passed,
      confidence: parsed.confidence,
      issues: parsed.issues || [],
      strengths: parsed.strengths || []
    };
  }
}
