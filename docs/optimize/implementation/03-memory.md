# 实施方案 - 03 Memory 管理模块

**对应设计文档**: `../design/workflow-optimization-proposal-04-mechanisms.md` (4.2节)

---

## 1. 模块职责

Memory 管理模块负责：

| 职责 | 说明 |
|------|------|
| **核心记忆持久化** | 跨阶段共享的关键信息存储 |
| **阶段记忆归纳** | 阶段结束时精华提取 |
| **临时记忆管理** | 单次调用后清理 |
| **审计日志** | 决策轨迹记录 |

---

## 2. Memory 分层架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Memory 分层架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     核心记忆 (Core Memory)                           │    │
│  │                                                                     │    │
│  │  生命周期: 整个任务周期                                               │    │
│  │  存储位置: .agentmem/request.md, .agentmem/project.md               │    │
│  │                                                                     │    │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │    │
│  │  │ 需求摘要      │ │ 验收标准      │ │ 项目约束      │              │    │
│  │  │ ≤500字       │ │ 列表格式      │ │ 从代码归纳    │              │    │
│  │  └───────────────┘ └───────────────┘ └───────────────┘              │    │
│  │  ┌───────────────┐ ┌───────────────┐                                │    │
│  │  │ 选定方案      │ │ 当前 Todo     │                                │    │
│  │  │ ≤300字       │ │ Phase 3 only │                                │    │
│  │  └───────────────┘ └───────────────┘                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     阶段记忆 (Phase Memory)                          │    │
│  │                                                                     │    │
│  │  生命周期: 单阶段内                                                   │    │
│  │  处理方式: 阶段结束后归纳精华，丢弃细节                                 │    │
│  │                                                                     │    │
│  │  Phase 1:                                                           │    │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │    │
│  │  │ Solver 方案   │ │ Critic 反馈   │ │ 代码检索结果  │              │    │
│  │  │ (完整版)      │ │ (问题清单)    │ │ (原文)        │              │    │
│  │  └───────────────┘ └───────────────┘ └───────────────┘              │    │
│  │           │                │                  │                      │    │
│  │           └────────────────┼──────────────────┘                      │    │
│  │                            ▼ (归纳)                                   │    │
│  │                   ┌───────────────┐                                  │    │
│  │                   │ 方案摘要≤300字 │ → 存入核心记忆                    │    │
│  │                   └───────────────┘                                  │    │
│  │                                                                     │    │
│  │  Phase 3:                                                           │    │
│  │  ┌───────────────┐ ┌───────────────┐                                │    │
│  │  │ Coder 变更    │ │ Reviewer 意见 │                                │    │
│  │  │ (完整 diff)   │ │ (完整分析)    │                                │    │
│  │  └───────────────┘ └───────────────┘                                │    │
│  │           │                │                                         │    │
│  │           ▼ (归纳)         ▼                                         │    │
│  │  ┌───────────────┐ ┌───────────────┐                                │    │
│  │  │ 变更摘要      │ │ 审核结论      │ → 存入日志                       │    │
│  │  └───────────────┘ └───────────────┘                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     临时记忆 (Temporary Memory)                       │    │
│  │                                                                     │    │
│  │  生命周期: 单次 Agent 调用                                            │    │
│  │  处理方式: 用完即弃，不保存                                            │    │
│  │                                                                     │    │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │    │
│  │  │ Agent 推理    │ │ 中间计算      │ │ 被拒方案细节  │              │    │
│  │  │ 过程          │ │               │ │               │              │    │
│  │  └───────────────┘ └───────────────┘ └───────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 类型定义

```typescript
// 文件: packages/ccq-workflow/src/memory/types.ts

/**
 * 核心记忆 - 跨阶段持久化
 */
export interface CoreMemory {
  /**
   * 需求摘要（≤500字）
   */
  requirement: string;
  
  /**
   * 验收标准列表
   */
  acceptanceCriteria: string[];
  
  /**
   * 项目约束（从代码检索归纳）
   */
  constraints: string[];
  
  /**
   * 选定方案摘要（≤300字）
   */
  chosenPlan: string;
  
  /**
   * 当前执行的 todo（仅 Phase 3）
   */
  currentTodo?: TodoItem;
}

/**
 * 阶段记忆 - 阶段内保留
 */
export interface PhaseMemory {
  phase: WorkflowPhase;
  startTime: Date;
  
  // Phase 1 数据
  codeContext?: CodeChunk[];
  analystResult?: AnalystOutput;
  solverSolution?: Solution;
  criticReview?: CriticOutput;
  
  // Phase 2 数据
  plannerResult?: PlannerOutput;
  
  // Phase 3 数据（per todo）
  coderChanges?: CodeChange[];
  reviewerResult?: ReviewerOutput;
  
  // Phase 4 数据
  testResults?: TestResult[];
}

/**
 * 审计日志条目
 */
export interface TraceLogEntry {
  timestamp: string;
  phase: WorkflowPhase;
  event: TraceEvent;
  data?: Record<string, any>;
}

export type TraceEvent = 
  | 'phase_start'
  | 'phase_end'
  | 'agent_call'
  | 'agent_result'
  | 'user_input'
  | 'user_confirm'
  | 'file_change'
  | 'error';

/**
 * 决策日志
 */
export interface DecisionLog {
  id: string;
  timestamp: string;
  type: 'plan_confirm' | 'todo_confirm' | 'high_risk_confirm';
  summary: string;
  details: string;
  outcome: 'approved' | 'rejected' | 'adjusted';
}
```

---

## 4. MemoryManager 实现

```typescript
// 文件: packages/ccq-workflow/src/memory/manager.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { CoreMemory, PhaseMemory, TraceLogEntry, DecisionLog } from './types';
import { LLMClient } from '../llm/client';

/**
 * Memory 管理器
 */
export class MemoryManager {
  private readonly agentmemDir: string;
  private coreMemory: CoreMemory;
  private phaseMemory: PhaseMemory;
  private llmClient: LLMClient;
  
  constructor(projectRoot: string, llmClient: LLMClient) {
    this.agentmemDir = path.join(projectRoot, '.agentmem');
    this.llmClient = llmClient;
    this.coreMemory = this.createEmptyCoreMemory();
    this.phaseMemory = { phase: 'init', startTime: new Date() };
  }
  
  // ========== 核心记忆操作 ==========
  
  /**
   * 获取核心记忆
   */
  getCoreMemory(): CoreMemory {
    return { ...this.coreMemory };
  }
  
  /**
   * 更新核心记忆字段
   */
  updateCoreMemory(updates: Partial<CoreMemory>): void {
    this.coreMemory = { ...this.coreMemory, ...updates };
  }
  
  /**
   * 从文件加载核心记忆
   */
  async loadCoreMemory(): Promise<CoreMemory> {
    try {
      const requestPath = path.join(this.agentmemDir, 'request.md');
      const content = await fs.readFile(requestPath, 'utf-8');
      
      const parsed = this.parseRequestMd(content);
      this.coreMemory = parsed;
      
      return this.coreMemory;
    } catch (error) {
      // 文件不存在，返回空记忆
      return this.createEmptyCoreMemory();
    }
  }
  
  /**
   * 持久化核心记忆到文件
   */
  async saveCoreMemory(): Promise<void> {
    const content = this.formatRequestMd(this.coreMemory);
    const requestPath = path.join(this.agentmemDir, 'request.md');
    
    await fs.mkdir(this.agentmemDir, { recursive: true });
    await fs.writeFile(requestPath, content, 'utf-8');
  }
  
  // ========== 阶段记忆操作 ==========
  
  /**
   * 获取阶段记忆
   */
  getPhaseMemory(): PhaseMemory {
    return { ...this.phaseMemory };
  }
  
  /**
   * 更新阶段记忆
   */
  updatePhaseMemory(updates: Partial<PhaseMemory>): void {
    this.phaseMemory = { ...this.phaseMemory, ...updates };
  }
  
  /**
   * 开始新阶段
   */
  startPhase(phase: WorkflowPhase): void {
    this.phaseMemory = {
      phase,
      startTime: new Date()
    };
  }
  
  /**
   * 结束阶段，归纳精华
   * 
   * 这是 Memory 管理的关键：阶段结束时归纳，避免上下文膨胀
   */
  async endPhase(): Promise<void> {
    const phase = this.phaseMemory.phase;
    
    switch (phase) {
      case 'phase1':
        await this.summarizePhase1();
        break;
      case 'phase2':
        await this.summarizePhase2();
        break;
      case 'phase3':
        await this.summarizePhase3();
        break;
    }
    
    // 记录阶段结束日志
    await this.appendTraceLog({
      timestamp: new Date().toISOString(),
      phase,
      event: 'phase_end',
      data: {
        duration: Date.now() - this.phaseMemory.startTime.getTime()
      }
    });
  }
  
  /**
   * Phase 1 归纳：方案 → 摘要
   */
  private async summarizePhase1(): Promise<void> {
    const solution = this.phaseMemory.solverSolution;
    if (!solution) return;
    
    // 使用 LLM 归纳方案为 ≤300 字摘要
    const summary = await this.llmSummarize(
      `将以下技术方案归纳为 ≤300 字的摘要：\n\n${JSON.stringify(solution, null, 2)}`,
      300
    );
    
    // 存入核心记忆
    this.updateCoreMemory({ chosenPlan: summary });
    
    // 丢弃完整方案（释放内存）
    delete this.phaseMemory.solverSolution;
    delete this.phaseMemory.criticReview;
    delete this.phaseMemory.codeContext;
  }
  
  /**
   * Phase 2 归纳：保留结构化 todolist
   */
  private async summarizePhase2(): Promise<void> {
    // todolist 本身就是结构化的，无需归纳
    // 只需丢弃 Planner 的推理过程（如果有）
  }
  
  /**
   * Phase 3 归纳：变更 → 摘要
   */
  private async summarizePhase3(): Promise<void> {
    const changes = this.phaseMemory.coderChanges;
    if (!changes) return;
    
    // 归纳为简短描述
    const summary = changes.map(c => 
      `${c.action} ${c.filePath} (${c.linesChanged} 行)`
    ).join('\n');
    
    // 记录到日志
    await this.appendTraceLog({
      timestamp: new Date().toISOString(),
      phase: this.phaseMemory.phase,
      event: 'file_change',
      data: { summary }
    });
    
    // 丢弃完整 diff
    delete this.phaseMemory.coderChanges;
    delete this.phaseMemory.reviewerResult;
  }
  
  // ========== 代码上下文归纳 ==========
  
  /**
   * 归纳代码检索结果为约束
   * 
   * 关键：不把完整代码传入后续 Agent，只传归纳后的约束
   */
  async summarizeCodeContext(context: CodeChunk[]): Promise<string[]> {
    if (!context || context.length === 0) {
      return [];
    }
    
    const prompt = `
分析以下代码片段，提取项目约束和模式：

${context.map(c => `
### ${c.filePath}
\`\`\`${c.language}
${c.content}
\`\`\`
`).join('\n')}

输出格式（JSON 数组，每项 ≤50 字）：
["约束1", "约束2", ...]

提取要点：
- 使用的框架和库
- 数据库和 ORM
- 命名规范（camelCase/snake_case）
- 现有工具函数和模式
- 项目结构约定
`;
    
    const result = await this.llmClient.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });
    
    // 提取 JSON
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    
    return JSON.parse(jsonMatch[0]);
  }
  
  // ========== 审计日志 ==========
  
  /**
   * 追加 trace 日志
   */
  async appendTraceLog(entry: TraceLogEntry): Promise<void> {
    const logPath = path.join(this.agentmemDir, 'logs', 'trace.jsonl');
    
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, line, 'utf-8');
  }
  
  /**
   * 记录决策
   */
  async logDecision(decision: Omit<DecisionLog, 'id' | 'timestamp'>): Promise<void> {
    const log: DecisionLog = {
      id: `decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...decision
    };
    
    const logPath = path.join(
      this.agentmemDir, 
      'logs', 
      `decision-${log.id}.md`
    );
    
    const content = `
# 决策记录: ${log.type}

**时间**: ${log.timestamp}
**结果**: ${log.outcome}

## 摘要
${log.summary}

## 详情
${log.details}
`.trim();
    
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, content, 'utf-8');
  }
  
  /**
   * 读取 trace 日志
   */
  async readTraceLog(): Promise<TraceLogEntry[]> {
    const logPath = path.join(this.agentmemDir, 'logs', 'trace.jsonl');
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
  
  // ========== 文件格式化 ==========
  
  /**
   * 解析 request.md
   */
  private parseRequestMd(content: string): CoreMemory {
    // 解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch 
      ? yaml.parse(frontmatterMatch[1])
      : {};
    
    // 解析正文
    const bodyMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
    const body = bodyMatch ? bodyMatch[1] : content;
    
    // 提取验收标准
    const acceptanceMatch = body.match(/## 验收标准\n([\s\S]*?)(?=\n##|$)/);
    const acceptanceCriteria = acceptanceMatch
      ? acceptanceMatch[1]
          .split('\n')
          .filter(line => line.match(/^- \[[ x]\]/))
          .map(line => line.replace(/^- \[[ x]\] /, ''))
      : [];
    
    return {
      requirement: frontmatter.summary || '',
      acceptanceCriteria,
      constraints: frontmatter.constraints || [],
      chosenPlan: frontmatter.chosen_plan || ''
    };
  }
  
  /**
   * 格式化 request.md
   */
  private formatRequestMd(memory: CoreMemory): string {
    const frontmatter = yaml.stringify({
      created_at: new Date().toISOString(),
      status: 'confirmed',
      summary: memory.requirement,
      chosen_plan: memory.chosenPlan,
      constraints: memory.constraints
    });
    
    const body = `
# 需求文档

## 需求摘要
${memory.requirement}

## 技术方案
${memory.chosenPlan}

## 验收标准
${memory.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

## 项目约束
${memory.constraints.map(c => `- ${c}`).join('\n')}
`.trim();
    
    return `---\n${frontmatter}---\n\n${body}`;
  }
  
  // ========== 辅助方法 ==========
  
  private createEmptyCoreMemory(): CoreMemory {
    return {
      requirement: '',
      acceptanceCriteria: [],
      constraints: [],
      chosenPlan: ''
    };
  }
  
  private async llmSummarize(content: string, maxLength: number): Promise<string> {
    const result = await this.llmClient.complete({
      messages: [{
        role: 'user',
        content: `${content}\n\n请确保输出不超过 ${maxLength} 字。`
      }],
      temperature: 0.2
    });
    
    return result.slice(0, maxLength);
  }
}
```

---

## 5. TodoList 管理器

```typescript
// 文件: packages/ccq-workflow/src/memory/todolist-manager.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { TodoList, TodoItem } from '../agents/planner';

/**
 * TodoList 管理器
 * 
 * 负责 todolist.md 的读写和状态更新
 */
export class TodoListManager {
  private readonly todolistPath: string;
  private todolist: TodoList | null = null;
  
  constructor(projectRoot: string) {
    this.todolistPath = path.join(projectRoot, '.agentmem', 'todolist.md');
  }
  
  /**
   * 加载 todolist
   */
  async load(): Promise<TodoList> {
    try {
      const content = await fs.readFile(this.todolistPath, 'utf-8');
      this.todolist = this.parse(content);
      return this.todolist;
    } catch {
      throw new Error('todolist.md 不存在，请先完成 Phase 2');
    }
  }
  
  /**
   * 保存 todolist
   */
  async save(): Promise<void> {
    if (!this.todolist) {
      throw new Error('没有可保存的 todolist');
    }
    
    const content = this.format(this.todolist);
    await fs.writeFile(this.todolistPath, content, 'utf-8');
  }
  
  /**
   * 获取下一个待执行的 todo
   */
  getNextPending(): TodoItem | null {
    if (!this.todolist) return null;
    
    // 按执行顺序查找第一个 pending
    for (const layer of this.todolist.executionOrder) {
      for (const todoId of layer) {
        const todo = this.todolist.todos.find(t => t.id === todoId);
        if (todo && todo.status === 'pending') {
          // 检查依赖是否都已完成
          const depsCompleted = todo.dependsOn.every(depId => {
            const dep = this.todolist!.todos.find(t => t.id === depId);
            return dep?.status === 'completed';
          });
          
          if (depsCompleted) {
            return todo;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * 更新 todo 状态
   */
  async updateStatus(todoId: string, status: TodoItem['status']): Promise<void> {
    if (!this.todolist) {
      await this.load();
    }
    
    const todo = this.todolist!.todos.find(t => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo not found: ${todoId}`);
    }
    
    todo.status = status;
    
    // 重新计算进度
    this.updateProgress();
    
    await this.save();
  }
  
  /**
   * 获取进度统计
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    if (!this.todolist) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const total = this.todolist.todos.length;
    const completed = this.todolist.todos.filter(t => t.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }
  
  // ========== 格式化 ==========
  
  private parse(content: string): TodoList {
    // 解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('todolist.md 格式错误：缺少 frontmatter');
    }
    
    const data = yaml.parse(frontmatterMatch[1]);
    
    return {
      meta: data.meta,
      todos: data.todos,
      executionOrder: data.executionOrder || this.inferExecutionOrder(data.todos)
    };
  }
  
  private format(todolist: TodoList): string {
    const data = {
      meta: todolist.meta,
      todos: todolist.todos,
      executionOrder: todolist.executionOrder
    };
    
    const frontmatter = yaml.stringify(data);
    
    const body = this.formatReadableBody(todolist);
    
    return `---\n${frontmatter}---\n\n${body}`;
  }
  
  private formatReadableBody(todolist: TodoList): string {
    const progress = this.getProgress();
    
    let body = `# 任务清单\n\n`;
    body += `**进度**: ${progress.completed}/${progress.total} (${progress.percentage}%)\n\n`;
    body += `## 任务列表\n\n`;
    
    const statusEmoji: Record<string, string> = {
      pending: '⬜',
      in_progress: '🔄',
      completed: '✅',
      blocked: '❌'
    };
    
    for (const todo of todolist.todos) {
      const emoji = statusEmoji[todo.status] || '⬜';
      body += `### ${emoji} ${todo.id}: ${todo.content}\n\n`;
      body += `- **状态**: ${todo.status}\n`;
      body += `- **优先级**: ${todo.priority}\n`;
      body += `- **工作量**: ${todo.points} 点\n`;
      
      if (todo.dependsOn.length > 0) {
        body += `- **依赖**: ${todo.dependsOn.join(', ')}\n`;
      }
      
      body += `- **验收条件**:\n`;
      for (const acc of todo.acceptance) {
        body += `  - ${acc}\n`;
      }
      
      body += '\n';
    }
    
    return body;
  }
  
  private inferExecutionOrder(todos: TodoItem[]): string[][] {
    // 简单拓扑排序
    const order: string[][] = [];
    const remaining = new Set(todos.map(t => t.id));
    
    while (remaining.size > 0) {
      const layer: string[] = [];
      
      for (const todoId of remaining) {
        const todo = todos.find(t => t.id === todoId)!;
        const depsResolved = todo.dependsOn.every(d => !remaining.has(d));
        
        if (depsResolved) {
          layer.push(todoId);
        }
      }
      
      if (layer.length === 0) {
        throw new Error('检测到循环依赖');
      }
      
      for (const id of layer) {
        remaining.delete(id);
      }
      
      order.push(layer);
    }
    
    return order;
  }
  
  private updateProgress(): void {
    if (!this.todolist) return;
    
    const progress = this.getProgress();
    this.todolist.meta.progress = `${progress.percentage}%`;
  }
}
```

---

## 6. 文件结构

```
packages/ccq-workflow/src/memory/
├── index.ts                    # 导出入口
├── types.ts                    # 类型定义
├── manager.ts                  # MemoryManager
├── todolist-manager.ts         # TodoList 管理
└── summarizers.ts              # 归纳辅助函数

.agentmem/
├── request.md                  # 核心记忆 - 需求文档
├── todolist.md                 # 核心记忆 - 任务列表
├── project.md                  # 项目配置
└── logs/
    ├── trace.jsonl             # 审计轨迹（JSONL 格式）
    └── decision-xxx.md         # 决策记录
```

---

## 7. 存储格式规范

### 7.1 request.md

```yaml
---
created_at: "2026-01-22T10:30:00Z"
status: confirmed
summary: "实现用户登录功能，使用 JWT 认证"
chosen_plan: "三层架构，Controller -> Service -> Repository..."
constraints:
  - "框架: Express.js + TypeScript"
  - "数据库: PostgreSQL + Prisma"
completeness_score: 9
---

# 需求文档

## 需求摘要
实现用户登录功能，使用 JWT 认证...

## 技术方案
三层架构，Controller -> Service -> Repository...

## 验收标准
- [ ] 用户可以使用邮箱密码登录
- [ ] 返回有效的 JWT Token
- [ ] 密码错误返回 401

## 项目约束
- 框架: Express.js + TypeScript
- 数据库: PostgreSQL + Prisma
```

### 7.2 trace.jsonl

```jsonl
{"timestamp":"2026-01-22T10:30:00Z","phase":"phase1.context_retrieval","event":"phase_start","data":{}}
{"timestamp":"2026-01-22T10:30:05Z","phase":"phase1.analyst_scoring","event":"agent_call","data":{"agent":"analyst"}}
{"timestamp":"2026-01-22T10:30:15Z","phase":"phase1.analyst_scoring","event":"agent_result","data":{"score":8}}
{"timestamp":"2026-01-22T10:30:16Z","phase":"phase1.solver_design","event":"agent_call","data":{"agent":"solver"}}
```

---

## 8. 验收标准

| 检查项 | 通过条件 |
|--------|----------|
| **核心记忆持久化** | 中断后重启可恢复状态 |
| **阶段归纳** | Phase 1 结束后 Solver 完整方案被删除，只保留摘要 |
| **Token 控制** | 代码上下文归纳后 ≤500 tokens |
| **日志完整** | trace.jsonl 包含所有状态转换 |
| **决策可追溯** | 关键决策有对应 decision-xxx.md |

---

## 9. 测试要点

```typescript
describe('MemoryManager', () => {
  describe('核心记忆', () => {
    it('should persist and reload core memory', async () => {
      // 保存后重新加载应该一致
    });
    
    it('should update partial fields', async () => {
      // 部分更新不影响其他字段
    });
  });
  
  describe('阶段归纳', () => {
    it('should summarize phase 1 to ≤300 chars', async () => {
      // 方案摘要长度限制
    });
    
    it('should clear phase data after summarize', async () => {
      // 归纳后原始数据被清理
    });
  });
  
  describe('代码上下文归纳', () => {
    it('should extract constraints from code', async () => {
      const context = [{ content: 'import express from...' }];
      const constraints = await manager.summarizeCodeContext(context);
      expect(constraints).toContain('框架: Express.js');
    });
  });
});

describe('TodoListManager', () => {
  it('should respect dependency order', async () => {
    // 依赖未完成时不返回该 todo
  });
  
  it('should update progress on status change', async () => {
    // 状态更新后进度百分比正确
  });
});
```
