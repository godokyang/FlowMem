/**
 * Reviewer Agent 实现
 *
 * 负责代码审核、偷懒检测、验收条件检查
 */

import { BaseAgent } from './base';
import { LLMClient } from '../llm/client';
import {
  ReviewerInput,
  ReviewerOutput,
  ReviewerIssue,
  AcceptanceResult
} from './types';

export class ReviewerAgent extends BaseAgent<ReviewerInput, ReviewerOutput> {
  name = 'reviewer';

  constructor(llmClient: LLMClient) {
    super(llmClient);
  }

  buildPrompt(input: ReviewerInput): string {
    const changesStr = input.changes.map(c => `
**${c.action.toUpperCase()}: ${c.filePath}** (${c.linesChanged} 行)

\`\`\`
${c.content || c.diff}
\`\`\`
`).join('\n');

    const acceptanceStr = input.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

    return `
# 角色：代码审核员

你是一位严格的代码审核员，负责确保代码质量和验收条件满足。

## 审核原则

1. **验收优先**: 首先检查是否满足验收条件
2. **偷懒检测**: 严格检测 TODO/console.log 等敷衍实现
3. **类型安全**: 不允许 any 类型和类型忽略
4. **独立判断**: 只看代码，不考虑实现者的"意图"

## 审核清单

| 级别 | 检查项 | 必须通过 |
|------|--------|----------|
| **Critical** | 代码有实际逻辑（非 console.log/TODO） | ✅ |
| **Critical** | 无 \`as any\` / \`@ts-ignore\` | ✅ |
| **Critical** | 满足 todo 的 acceptance 条件 | ✅ |
| Major | 错误处理完整 | 建议 |
| Minor | 命名清晰、注释适当 | 可选 |

## 偷懒代码模式（Critical）

以下模式视为偷懒，必须拒绝：

\`\`\`
❌ console.log('TODO')
❌ console.log('实现中...')
❌ // TODO: implement later
❌ throw new Error('Not implemented')
❌ return null // placeholder
❌ 空函数体 function foo() {}
\`\`\`

## 输入

### 当前任务
**ID**: ${input.todo.id}
**内容**: ${input.todo.content}

### 验收条件
${acceptanceStr}

### 代码变更
${changesStr}

## 输出格式（JSON）

\`\`\`json
{
  "passed": false,
  "acceptanceResults": [
    {
      "criterion": "validatePassword 正确验证密码",
      "met": true,
      "evidence": "第 23-35 行实现了 bcrypt.compare"
    },
    {
      "criterion": "登录失败返回正确错误码",
      "met": false,
      "evidence": null
    }
  ],
  "issues": [
    {
      "type": "acceptance_not_met",
      "severity": "critical",
      "description": "登录失败时直接 throw Error，未返回特定错误码",
      "location": "src/services/auth.service.ts:42",
      "suggestion": "使用 AuthError 类返回 AUTH_INVALID_CREDENTIALS 错误码"
    }
  ],
  "lazyCodeDetected": false
}
\`\`\`

## 通过标准

- 无 critical 问题
- 所有 acceptance 条件满足
- 无偷懒代码

请审核代码并输出 JSON。
`.trim();
  }

  parseOutput(rawOutput: string): ReviewerOutput {
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Reviewer 输出格式错误：未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const hasCritical = parsed.issues?.some((i: ReviewerIssue) => i.severity === 'critical');
    const allAcceptanceMet = parsed.acceptanceResults?.every((r: AcceptanceResult) => r.met);

    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      passed: !hasCritical && allAcceptanceMet && !parsed.lazyCodeDetected,
      acceptanceResults: parsed.acceptanceResults || [],
      issues: parsed.issues || [],
      lazyCodeDetected: parsed.lazyCodeDetected || false
    };
  }
}
