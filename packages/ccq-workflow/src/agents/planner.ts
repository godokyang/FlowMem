/**
 * Planner Agent 实现
 *
 * 负责任务分解、WBS、依赖分析
 */

import { BaseAgent } from './base';
import { LLMClient } from '../llm/client';
import {
  PlannerInput,
  PlannerOutput,
  TodoList,
  TodoItem
} from './types';

export class PlannerAgent extends BaseAgent<PlannerInput, PlannerOutput> {
  name = 'planner';

  constructor(llmClient: LLMClient) {
    super(llmClient);
  }

  buildPrompt(input: PlannerInput): string {
    return `
# 角色：任务规划师

你是一位项目管理专家，负责将技术方案分解为可执行的任务列表。

## 分解原则

1. **原子性**: 每个 todo 应该可以独立完成和验证
2. **可验收**: 每个 todo 必须有明确的验收条件
3. **依赖清晰**: 明确标注任务间依赖关系
4. **工作量合理**: 单个 todo 工作量 1-5 点（1点 ≈ 1-2小时）

## WBS 层级

\`\`\`
Level 1: 功能
  └── Level 2: 模块（前端/后端/数据库）
        └── Level 3: 文件/任务
              └── TODO-XXX: 具体任务 + 验收条件
\`\`\`

## 输入

### 需求
${input.requirement}

### 选定方案
${input.chosenPlan}

${this.formatCoreMemory(input.coreMemory ?? { requirement: '', acceptanceCriteria: [], constraints: [], chosenPlan: '' })}

## 输出格式（JSON）

\`\`\`json
{
  "todolist": {
    "meta": {
      "requestRef": ".agentmem/request.md",
      "totalPoints": 13,
      "estimatedHours": 16
    },
    "todos": [
      {
        "id": "TODO-001",
        "content": "创建 User 数据模型和 Prisma schema",
        "status": "pending",
        "priority": "high",
        "points": 2,
        "dependsOn": [],
        "acceptance": [
          "User 模型包含 id, email, password, createdAt 字段",
          "Prisma migrate 成功执行",
          "类型定义正确导出"
        ],
        "files": ["prisma/schema.prisma", "src/models/user.ts"]
      },
      {
        "id": "TODO-002",
        "content": "实现 AuthService 登录逻辑",
        "status": "pending",
        "priority": "high",
        "points": 3,
        "dependsOn": ["TODO-001"],
        "acceptance": [
          "validatePassword 正确验证密码",
          "generateToken 生成有效 JWT",
          "登录失败返回正确错误码"
        ],
        "files": ["src/services/auth.service.ts"]
      }
    ],
    "executionOrder": [
      ["TODO-001"],
      ["TODO-002", "TODO-003"],
      ["TODO-004"]
    ]
  }
}
\`\`\`

请分解任务并输出 JSON。
`.trim();
  }

  parseOutput(rawOutput: string): PlannerOutput {
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Planner 输出格式错误：未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      todolist: parsed.todolist
    };
  }
}
