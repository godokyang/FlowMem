/**
 * Coder Agent 实现
 *
 * 负责代码实现、接受 Reviewer 反馈
 */

import { BaseAgent } from './base';
import { LLMClient } from '../llm/client';
import {
  CoderInput,
  CoderOutput,
  CodeChange
} from './types';

export class CoderAgent extends BaseAgent<CoderInput, CoderOutput> {
  name = 'coder';

  constructor(llmClient: LLMClient) {
    super(llmClient);
  }

  buildPrompt(input: CoderInput): string {
    const contextStr = input.context.map(c => `
**${c.filePath}**:
\`\`\`${c.language}
${c.content}
\`\`\`
`).join('\n');

    const feedbackSection = input.reviewerFeedback
      ? `
## Reviewer 反馈（需修复）

${input.reviewerFeedback.map((issue, i) => `
### 问题 ${i + 1}: ${issue.type}
${issue.description}

**位置**: ${issue.location || '未指定'}
**建议**: ${issue.suggestion}
`).join('\n')}

请针对以上问题修改代码。
`
      : '';

    return `
# 角色：代码实现者

你是一位资深开发者，负责实现单个具体任务。

## 实现原则

1. **只做指定任务**: 不做额外的"改进"或"优化"
2. **遵循规范**: 使用项目现有的代码风格和模式
3. **完整实现**: 不能用 console.log('TODO') 糊弄
4. **错误处理**: 必须处理异常情况
5. **类型安全**: 不使用 any 类型

## 禁止事项

- ❌ \`console.log('TODO')\` 或空实现
- ❌ \`as any\` 或 \`@ts-ignore\`
- ❌ 空的 catch 块 \`catch(e) {}\`
- ❌ 超出任务范围的修改

## 输入

### 当前任务
**ID**: ${input.todo.id}
**内容**: ${input.todo.content}

**验收条件**:
${input.todo.acceptance.map(a => `- ${a}`).join('\n')}

**涉及文件**: ${input.todo.files.join(', ')}

### 相关代码上下文
${contextStr}

${this.formatCoreMemory(input.coreMemory ?? { requirement: '', acceptanceCriteria: [], constraints: [], chosenPlan: '' })}

${feedbackSection}

## 输出格式（JSON）

\`\`\`json
{
  "changes": [
    {
      "filePath": "src/services/auth.service.ts",
      "action": "create",
      "content": "import { hash, compare } from 'bcrypt';\\n\\nexport class AuthService {\\n  // 完整代码...\\n}",
      "linesChanged": 45
    }
  ],
  "explanation": "实现了 AuthService，包含 validatePassword 和 generateToken 方法..."
}
\`\`\`

请实现任务并输出 JSON。
`.trim();
  }

  parseOutput(rawOutput: string): CoderOutput {
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Coder 输出格式错误：未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      changes: parsed.changes || [],
      explanation: parsed.explanation || ''
    };
  }
}
