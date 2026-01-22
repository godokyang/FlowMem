# 实施方案 - 02 Agent 实现模块

**对应设计文档**: `../design/workflow-optimization-proposal-02-core-decisions.md` (2.6节 Agent 清单)

---

## 1. 模块概述

系统共有 **6 个 Agent**（Orchestrator 用代码实现，不算 Agent）：

| Agent | 阶段 | 职责 |
|-------|------|------|
| **Analyst** | Phase 1.2 | 需求分析、完整性评分、追问生成 |
| **Solver** | Phase 1.3 | 方案设计 |
| **Critic** | Phase 1.3 | 方案审核 |
| **Planner** | Phase 2 | 任务分解、WBS、依赖分析 |
| **Coder** | Phase 3 | 代码实现 |
| **Reviewer** | Phase 3 | 代码审核、质量把关 |

**关键设计**: 所有 Agent 使用同一 LLM（如 Claude），但每个 Agent 独立调用、独立上下文。

---

## 2. 通用 Agent 基础设施

### 2.1 Agent 接口定义

```typescript
// 文件: packages/ccq-workflow/src/agents/types.ts

/**
 * Agent 基础输入
 */
export interface AgentInput {
  // 核心记忆（跨阶段共享）
  coreMemory?: CoreMemory;
  
  // 特定 Agent 的输入参数
  [key: string]: any;
}

/**
 * Agent 基础输出
 */
export interface AgentOutput {
  // Agent 名称
  agent: string;
  
  // 执行耗时
  durationMs: number;
  
  // Token 使用
  tokensUsed: {
    input: number;
    output: number;
  };
  
  // 特定 Agent 的输出
  [key: string]: any;
}

/**
 * Agent 接口
 */
export interface Agent<TInput extends AgentInput, TOutput extends AgentOutput> {
  name: string;
  
  /**
   * 构建 Prompt
   */
  buildPrompt(input: TInput): string;
  
  /**
   * 解析 LLM 输出
   */
  parseOutput(rawOutput: string): TOutput;
  
  /**
   * 执行 Agent
   */
  execute(input: TInput): Promise<TOutput>;
}
```

### 2.2 Agent 注册表

```typescript
// 文件: packages/ccq-workflow/src/agents/registry.ts

import { Agent, AgentInput, AgentOutput } from './types';
import { LLMClient } from '../llm/client';

/**
 * Agent 注册表
 * 
 * 管理所有 Agent 的注册和调用
 */
export class AgentRegistry {
  private agents: Map<string, Agent<any, any>> = new Map();
  private llmClient: LLMClient;
  
  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
    this.registerBuiltinAgents();
  }
  
  /**
   * 注册内置 Agent
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
  register<T extends Agent<any, any>>(agent: T): void {
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
}
```

### 2.3 Agent 基类

```typescript
// 文件: packages/ccq-workflow/src/agents/base.ts

import { Agent, AgentInput, AgentOutput } from './types';
import { LLMClient } from '../llm/client';

/**
 * Agent 基类
 */
export abstract class BaseAgent<TInput extends AgentInput, TOutput extends AgentOutput>
  implements Agent<TInput, TOutput> {
  
  abstract name: string;
  protected llmClient: LLMClient;
  
  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
  }
  
  abstract buildPrompt(input: TInput): string;
  abstract parseOutput(rawOutput: string): TOutput;
  
  async execute(input: TInput): Promise<TOutput> {
    const prompt = this.buildPrompt(input);
    
    const rawOutput = await this.llmClient.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3 // 较低温度，保证稳定性
    });
    
    return this.parseOutput(rawOutput);
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
```

---

## 3. Analyst Agent

### 3.1 职责

- 分析用户需求的完整性
- 评分（0-10）
- 生成针对性追问

### 3.2 实现

```typescript
// 文件: packages/ccq-workflow/src/agents/analyst.ts

import { BaseAgent } from './base';

export interface AnalystInput extends AgentInput {
  request: string;              // 用户原始请求
  constraints: string[];        // 项目约束
  previousClarifications?: string[]; // 之前的追问回答
}

export interface AnalystOutput extends AgentOutput {
  score: number;                // 完整性评分 (0-10)
  complexity: 'low' | 'medium' | 'high';
  summarizedRequirement: string; // 需求摘要
  clarifiedPoints: string[];    // 已明确的点
  unclearPoints: string[];      // 待澄清的点
  questions: ClarificationQuestion[]; // 追问问题
}

export interface ClarificationQuestion {
  dimension: 'goal' | 'outcome' | 'boundary' | 'constraint';
  question: string;
  options?: string[];           // 可选的选项
  default?: string;             // 智能默认值
}

export class AnalystAgent extends BaseAgent<AnalystInput, AnalystOutput> {
  name = 'analyst';
  
  buildPrompt(input: AnalystInput): string {
    return `
# 角色：需求分析师 (Analyst)

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
    // 提取 JSON
    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Analyst 输出格式错误：未找到 JSON');
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      ...parsed
    };
  }
}
```

---

## 4. Solver Agent

### 4.1 职责

- 根据需求设计技术方案
- 考虑项目约束和现有代码
- 可接受 Critic 反馈后修改

### 4.2 实现

```typescript
// 文件: packages/ccq-workflow/src/agents/solver.ts

export interface SolverInput extends AgentInput {
  requirement: string;          // 需求摘要
  constraints: string[];        // 项目约束
  previousSolution?: Solution;  // 之前的方案（迭代时）
  criticFeedback?: CriticIssue[]; // Critic 反馈（迭代时）
}

export interface SolverOutput extends AgentOutput {
  solution: Solution;
}

export interface Solution {
  title: string;
  overview: string;              // 方案概述（≤300字）
  architecture: string;          // 架构设计
  components: ComponentSpec[];   // 组件列表
  dataFlow: string;              // 数据流说明
  risks: string[];               // 已识别风险
  assumptions: string[];         // 假设前提
}

export interface ComponentSpec {
  name: string;
  type: 'api' | 'service' | 'model' | 'util' | 'ui';
  responsibility: string;
  dependencies: string[];
}

export class SolverAgent extends BaseAgent<SolverInput, SolverOutput> {
  name = 'solver';
  
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
## 之前的方案（V${input.criticFeedback ? '1' : '0'}）

${input.previousSolution.overview}

**组件**:
${input.previousSolution.components.map(c => `- ${c.name}: ${c.responsibility}`).join('\n')}
`
      : '';
    
    return `
# 角色：方案设计师 (Solver)

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
      throw new Error('Solver 输出格式错误');
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
```

---

## 5. Critic Agent

### 5.1 职责

- 独立审核 Solver 的方案
- 检查方向正确性、技术可行性、完整性、风险点
- 输出通过/拒绝 + 问题清单

### 5.2 关键隔离

**Critic 只看方案，不知道 Solver 的"思考过程"**。这是避免自我一致性偏见的关键。

### 5.3 实现

```typescript
// 文件: packages/ccq-workflow/src/agents/critic.ts

export interface CriticInput extends AgentInput {
  solution: Solution;           // Solver 的方案
  requirement: string;          // 需求摘要
  constraints: string[];        // 项目约束
}

export interface CriticOutput extends AgentOutput {
  passed: boolean;              // 是否通过
  confidence: number;           // 置信度 (0-100)
  issues: CriticIssue[];        // 问题清单
  strengths: string[];          // 方案优点
}

export interface CriticIssue {
  type: 'direction' | 'feasibility' | 'completeness' | 'risk' | 'compatibility';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  impact: string;
  suggestion: string;
}

export class CriticAgent extends BaseAgent<CriticInput, CriticOutput> {
  name = 'critic';
  
  buildPrompt(input: CriticInput): string {
    return `
# 角色：方案审核员 (Critic)

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
      throw new Error('Critic 输出格式错误');
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    // 自动判断是否通过
    const hasCritical = parsed.issues?.some((i: CriticIssue) => i.severity === 'critical');
    const majorCount = parsed.issues?.filter((i: CriticIssue) => i.severity === 'major').length || 0;
    
    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      passed: !hasCritical && majorCount <= 2,
      confidence: parsed.confidence,
      issues: parsed.issues || [],
      strengths: parsed.strengths || []
    };
  }
}
```

---

## 6. Planner Agent

### 6.1 职责

- 将方案分解为可执行的任务列表
- WBS（工作分解结构）
- 识别依赖关系
- 估算工作量

### 6.2 实现

```typescript
// 文件: packages/ccq-workflow/src/agents/planner.ts

export interface PlannerInput extends AgentInput {
  requirement: string;
  chosenPlan: string;           // 选定的方案摘要
}

export interface PlannerOutput extends AgentOutput {
  todolist: TodoList;
}

export interface TodoList {
  meta: {
    requestRef: string;
    totalPoints: number;
    estimatedHours: number;
  };
  todos: TodoItem[];
  executionOrder: string[][];   // 二维数组，每层可并行
}

export interface TodoItem {
  id: string;                   // TODO-001
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  points: number;               // 1点 ≈ 1-2小时
  dependsOn: string[];          // 依赖的 todo id
  acceptance: string[];         // 验收条件
  files: string[];              // 涉及的文件（预估）
}

export class PlannerAgent extends BaseAgent<PlannerInput, PlannerOutput> {
  name = 'planner';
  
  buildPrompt(input: PlannerInput): string {
    return `
# 角色：任务规划师 (Planner)

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

${this.formatCoreMemory(input.coreMemory)}

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
      throw new Error('Planner 输出格式错误');
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
```

---

## 7. Coder Agent

### 7.1 职责

- 执行单个 Todo 的代码实现
- 只做指定任务，不做额外"改进"
- 可接受 Reviewer 反馈后修改

### 7.2 实现

```typescript
// 文件: packages/ccq-workflow/src/agents/coder.ts

export interface CoderInput extends AgentInput {
  todo: TodoItem;               // 当前任务
  context: CodeChunk[];         // 相关代码上下文
  previousChanges?: CodeChange[]; // 之前的实现（重试时）
  reviewerFeedback?: ReviewerIssue[]; // Reviewer 反馈（重试时）
}

export interface CoderOutput extends AgentOutput {
  changes: CodeChange[];
  explanation: string;          // 实现说明
}

export interface CodeChange {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;             // 完整文件内容（create/modify）
  diff?: string;                // diff 格式（modify）
  linesChanged: number;
}

export class CoderAgent extends BaseAgent<CoderInput, CoderOutput> {
  name = 'coder';
  
  buildPrompt(input: CoderInput): string {
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
# 角色：代码实现者 (Coder)

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

${input.context.map(c => `
**${c.filePath}**:
\`\`\`${c.language}
${c.content}
\`\`\`
`).join('\n')}

${this.formatCoreMemory(input.coreMemory)}

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
      throw new Error('Coder 输出格式错误');
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    return {
      agent: this.name,
      durationMs: 0,
      tokensUsed: { input: 0, output: 0 },
      changes: parsed.changes,
      explanation: parsed.explanation
    };
  }
}
```

---

## 8. Reviewer Agent

### 8.1 职责

- 审核 Coder 的代码变更
- 检查是否满足验收条件
- 检测"偷懒"行为
- 输出通过/拒绝 + 问题清单

### 8.2 关键隔离

**Reviewer 只看代码变更，不知道 Coder 的"推理过程"**。这是避免自我审核偏见的关键。

### 8.3 实现

```typescript
// 文件: packages/ccq-workflow/src/agents/reviewer.ts

export interface ReviewerInput extends AgentInput {
  todo: TodoItem;
  changes: CodeChange[];
  acceptanceCriteria: string[];
}

export interface ReviewerOutput extends AgentOutput {
  passed: boolean;
  acceptanceResults: AcceptanceResult[];
  issues: ReviewerIssue[];
  lazyCodeDetected: boolean;    // 是否检测到偷懒代码
}

export interface AcceptanceResult {
  criterion: string;
  met: boolean;
  evidence?: string;
}

export interface ReviewerIssue {
  type: 'lazy_code' | 'type_error' | 'missing_error_handling' | 
        'acceptance_not_met' | 'code_style' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location?: string;            // 文件:行号
  suggestion: string;
}

export class ReviewerAgent extends BaseAgent<ReviewerInput, ReviewerOutput> {
  name = 'reviewer';
  
  buildPrompt(input: ReviewerInput): string {
    return `
# 角色：代码审核员 (Reviewer)

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
${input.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### 代码变更

${input.changes.map(c => `
**${c.action.toUpperCase()}: ${c.filePath}** (${c.linesChanged} 行)

\`\`\`
${c.content || c.diff}
\`\`\`
`).join('\n')}

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
      throw new Error('Reviewer 输出格式错误');
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    // 自动判断是否通过
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
```

---

## 9. 文件结构

```
packages/ccq-workflow/src/agents/
├── index.ts                    # 导出入口
├── types.ts                    # 通用类型定义
├── base.ts                     # Agent 基类
├── registry.ts                 # Agent 注册表
├── analyst.ts                  # Analyst Agent
├── solver.ts                   # Solver Agent
├── critic.ts                   # Critic Agent
├── planner.ts                  # Planner Agent
├── coder.ts                    # Coder Agent
└── reviewer.ts                 # Reviewer Agent
```

---

## 10. 验收标准

| 检查项 | 通过条件 |
|--------|----------|
| **Prompt 结构化** | 每个 Agent 的 Prompt 包含角色、原则、输入、输出格式 |
| **输出可解析** | JSON 格式正确，parseOutput 不报错 |
| **隔离性** | Critic 不知道 Solver 思考过程，Reviewer 不知道 Coder 推理过程 |
| **偷懒检测** | Reviewer 能识别常见偷懒模式 |
| **评分自适应** | Analyst 能根据复杂度调整阈值 |

---

## 11. 测试要点

```typescript
describe('Agents', () => {
  describe('Analyst', () => {
    it('should score requirement completeness', async () => {
      // 验证评分逻辑
    });
    
    it('should generate clarification questions', async () => {
      // 验证追问生成
    });
  });
  
  describe('Critic', () => {
    it('should identify direction issues', async () => {
      // 验证方向问题检测
    });
    
    it('should pass valid solutions', async () => {
      // 验证正常方案通过
    });
  });
  
  describe('Reviewer', () => {
    it('should detect lazy code patterns', async () => {
      const input = {
        changes: [{
          content: 'console.log("TODO")'
        }]
      };
      const result = await reviewer.execute(input);
      expect(result.lazyCodeDetected).toBe(true);
      expect(result.passed).toBe(false);
    });
    
    it('should verify acceptance criteria', async () => {
      // 验证验收条件检查
    });
  });
});
```
