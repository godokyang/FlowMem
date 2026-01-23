# 实施方案 - 01 Orchestrator 状态机模块

**对应设计文档**: `../design/workflow-optimization-proposal-02-architecture.md` (2.2节)

---

## 1. 模块职责

Orchestrator 是整个工作流的控制中心，负责：

| 职责 | 说明 |
|------|------|
| **流程控制** | 按四阶段顺序调度 Agent，不可跳步 |
| **状态管理** | 维护当前阶段、进度、Memory |
| **用户交互** | 在关键介入点与用户沟通 |
| **异常处理** | 重试机制、超时、回退策略 |

---

## 2. 状态机设计

### 2.1 状态定义

```typescript
// 文件: packages/ccq-workflow/src/orchestrator/types.ts

/**
 * 工作流阶段枚举
 */
export enum WorkflowPhase {
  INIT = 'init',
  
  // Phase 1: 需求澄清
  PHASE1_CONTEXT_RETRIEVAL = 'phase1.context_retrieval',
  PHASE1_ANALYST_SCORING = 'phase1.analyst_scoring',
  PHASE1_WAIT_USER_CLARIFICATION = 'phase1.wait_user_clarification',
  PHASE1_SOLVER_DESIGN = 'phase1.solver_design',
  PHASE1_CRITIC_REVIEW = 'phase1.critic_review',
  PHASE1_WAIT_USER_CONFIRM_PLAN = 'phase1.wait_user_confirm_plan',
  PHASE1_GENERATE_REQUEST = 'phase1.generate_request',
  
  // Phase 2: 详细规划
  PHASE2_PLANNER_DECOMPOSE = 'phase2.planner_decompose',
  PHASE2_WAIT_USER_CONFIRM_TODO = 'phase2.wait_user_confirm_todo',
  PHASE2_GENERATE_TODOLIST = 'phase2.generate_todolist',
  
  // Phase 3: 执行与审核
  PHASE3_PICK_TODO = 'phase3.pick_todo',
  PHASE3_CODER_IMPLEMENT = 'phase3.coder_implement',
  PHASE3_REVIEWER_CHECK = 'phase3.reviewer_check',
  PHASE3_APPLY_CHANGES = 'phase3.apply_changes',
  PHASE3_UPDATE_PROGRESS = 'phase3.update_progress',
  PHASE3_WAIT_USER_HIGH_RISK = 'phase3.wait_user_high_risk',
  
  // Phase 4: 交付
  PHASE4_FINAL_CHECK = 'phase4.final_check',
  PHASE4_RUN_TESTS = 'phase4.run_tests',
  PHASE4_GENERATE_REPORT = 'phase4.generate_report',
  
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

/**
 * 状态机上下文
 */
export interface OrchestratorContext {
  // 当前状态
  phase: WorkflowPhase;
  
  // 用户原始请求
  userRequest: string;
  
  // 核心记忆（跨阶段持久化）
  memory: CoreMemory;
  
  // 阶段性数据（阶段结束后归纳）
  phaseData: PhaseData;
  
  // 执行元数据
  meta: {
    startTime: Date;
    retryCount: number;
    currentTodoIndex: number;
    lastError?: string;
  };
}

/**
 * 核心记忆 - 跨阶段持久化
 */
export interface CoreMemory {
  requirement: string;           // 用户需求摘要（≤500字）
  acceptanceCriteria: string[];  // 验收标准列表
  constraints: string[];         // 项目约束（从代码检索归纳）
  chosenPlan: string;            // 选定方案摘要（≤300字）
  currentTodo?: TodoItem;        // 当前执行的 todo
}

/**
 * 阶段性数据
 */
export interface PhaseData {
  // Phase 1
  codeContext?: CodeChunk[];
  analystResult?: AnalystResult;
  solverSolution?: Solution;
  criticReview?: CriticReview;
  
  // Phase 2
  todolist?: TodoList;
  
  // Phase 3
  coderChanges?: CodeChange[];
  reviewerResult?: ReviewResult;
  
  // Phase 4
  testResults?: TestResult[];
  deliveryReport?: string;
}
```

### 2.2 状态转换图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Orchestrator 状态机                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INIT                                                                       │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: 需求澄清                                                   │    │
│  │                                                                     │    │
│  │  context_retrieval ─▶ analyst_scoring ─▶ ┬─▶ solver_design         │    │
│  │                                          │                         │    │
│  │                         score < 7 ◀──────┤                         │    │
│  │                              │           │                         │    │
│  │                              ▼           │                         │    │
│  │                   wait_user_clarification                          │    │
│  │                              │                                     │    │
│  │                              ▼ (用户回答)                           │    │
│  │                        analyst_scoring ──┘                         │    │
│  │                                                                     │    │
│  │  solver_design ─▶ critic_review ─▶ ┬─▶ wait_user_confirm_plan      │    │
│  │       ▲                            │                               │    │
│  │       │ (round < 2)                │ (not passed)                  │    │
│  │       └────────────────────────────┘                               │    │
│  │                                    │ (round >= 2, not passed)      │    │
│  │                                    ▼                               │    │
│  │                          wait_user_confirm_plan (强制)             │    │
│  │                                    │                               │    │
│  │                                    ▼ (confirmed)                   │    │
│  │                          generate_request ──────────────────────▶  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                        │                                    │
│                                        ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: 详细规划                                                   │    │
│  │                                                                     │    │
│  │  planner_decompose ─▶ wait_user_confirm_todo ─▶ generate_todolist   │    │
│  │                              │                                      │    │
│  │                              ▼ (user adjusts)                       │    │
│  │                       planner_decompose (re-plan)                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                        │                                    │
│                                        ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: 执行与审核                                                 │    │
│  │                                                                     │    │
│  │  pick_todo ─▶ coder_implement ─▶ reviewer_check ─▶ ┬─▶ apply       │    │
│  │      ▲                                             │               │    │
│  │      │                                    (failed) │               │    │
│  │      │                                             ▼               │    │
│  │      │                                    coder_implement (retry)  │    │
│  │      │                                             │               │    │
│  │      │                          (retry >= 2, still failed)         │    │
│  │      │                                             ▼               │    │
│  │      │                                    wait_user_high_risk      │    │
│  │      │                                                             │    │
│  │      │ (more todos)     apply ─▶ update_progress ──────────────────┘    │
│  │      └─────────────────────────────────┘                            │    │
│  │                                                                     │    │
│  │                         (all todos done)                            │    │
│  │                              │                                      │    │
│  └──────────────────────────────│──────────────────────────────────────┘    │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 4: 交付                                                       │    │
│  │                                                                     │    │
│  │  final_check ─▶ run_tests ─▶ generate_report ─▶ COMPLETED           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心实现

### 3.1 状态机类

```typescript
// 文件: packages/ccq-workflow/src/orchestrator/orchestrator.ts

import { CCQEngine } from '@ccq/engine';
import { 
  WorkflowPhase, 
  OrchestratorContext, 
  CoreMemory 
} from './types';
import { AgentRegistry } from '../agents/registry';
import { MemoryManager } from '../memory/manager';
import { FileManager } from '../files/manager';

/**
 * Orchestrator 状态机
 * 
 * 设计原则：
 * - 流程控制用代码（确定性、可调试）
 * - 需要"理解"时才调用 LLM（归纳、整合、生成用户消息）
 */
export class Orchestrator {
  private context: OrchestratorContext;
  private ccqEngine: CCQEngine;
  private agents: AgentRegistry;
  private memoryManager: MemoryManager;
  private fileManager: FileManager;
  
  // 状态转换配置
  private readonly MAX_SOLVER_CRITIC_ROUNDS = 2;
  private readonly MAX_CODER_REVIEWER_ROUNDS = 2;
  private readonly DEFAULT_SCORE_THRESHOLD = 7;
  
  constructor(deps: OrchestratorDependencies) {
    this.ccqEngine = deps.ccqEngine;
    this.agents = deps.agents;
    this.memoryManager = deps.memoryManager;
    this.fileManager = deps.fileManager;
    
    this.context = this.initContext();
  }
  
  /**
   * 主运行循环 - 状态机核心
   */
  async run(userRequest: string): Promise<WorkflowResult> {
    this.context.userRequest = userRequest;
    this.context.meta.startTime = new Date();
    
    try {
      while (!this.isTerminalState()) {
        // 记录状态转换（审计日志）
        await this.logTransition(this.context.phase);
        
        // 执行当前状态对应的处理函数
        const nextPhase = await this.executeState(this.context.phase);
        
        // 状态转换
        this.context.phase = nextPhase;
      }
      
      return this.buildResult();
    } catch (error) {
      this.context.phase = WorkflowPhase.FAILED;
      this.context.meta.lastError = error.message;
      throw error;
    }
  }
  
  /**
   * 执行状态处理函数 - 核心分发器
   * 
   * 关键: 代码保证每个 Agent 一定会被调用，LLM 没有机会"偷懒跳过"
   */
  private async executeState(phase: WorkflowPhase): Promise<WorkflowPhase> {
    switch (phase) {
      // ========== Phase 1: 需求澄清 ==========
      
      case WorkflowPhase.INIT:
        return WorkflowPhase.PHASE1_CONTEXT_RETRIEVAL;
        
      case WorkflowPhase.PHASE1_CONTEXT_RETRIEVAL:
        return this.handleContextRetrieval();
        
      case WorkflowPhase.PHASE1_ANALYST_SCORING:
        return this.handleAnalystScoring();
        
      case WorkflowPhase.PHASE1_WAIT_USER_CLARIFICATION:
        return this.handleWaitUserClarification();
        
      case WorkflowPhase.PHASE1_SOLVER_DESIGN:
        return this.handleSolverDesign();
        
      case WorkflowPhase.PHASE1_CRITIC_REVIEW:
        return this.handleCriticReview();
        
      case WorkflowPhase.PHASE1_WAIT_USER_CONFIRM_PLAN:
        return this.handleWaitUserConfirmPlan();
        
      case WorkflowPhase.PHASE1_GENERATE_REQUEST:
        return this.handleGenerateRequest();
        
      // ========== Phase 2: 详细规划 ==========
      
      case WorkflowPhase.PHASE2_PLANNER_DECOMPOSE:
        return this.handlePlannerDecompose();
        
      case WorkflowPhase.PHASE2_WAIT_USER_CONFIRM_TODO:
        return this.handleWaitUserConfirmTodo();
        
      case WorkflowPhase.PHASE2_GENERATE_TODOLIST:
        return this.handleGenerateTodolist();
        
      // ========== Phase 3: 执行与审核 ==========
      
      case WorkflowPhase.PHASE3_PICK_TODO:
        return this.handlePickTodo();
        
      case WorkflowPhase.PHASE3_CODER_IMPLEMENT:
        return this.handleCoderImplement();
        
      case WorkflowPhase.PHASE3_REVIEWER_CHECK:
        return this.handleReviewerCheck();
        
      case WorkflowPhase.PHASE3_APPLY_CHANGES:
        return this.handleApplyChanges();
        
      case WorkflowPhase.PHASE3_UPDATE_PROGRESS:
        return this.handleUpdateProgress();
        
      case WorkflowPhase.PHASE3_WAIT_USER_HIGH_RISK:
        return this.handleWaitUserHighRisk();
        
      // ========== Phase 4: 交付 ==========
      
      case WorkflowPhase.PHASE4_FINAL_CHECK:
        return this.handleFinalCheck();
        
      case WorkflowPhase.PHASE4_RUN_TESTS:
        return this.handleRunTests();
        
      case WorkflowPhase.PHASE4_GENERATE_REPORT:
        return this.handleGenerateReport();
        
      default:
        throw new Error(`未知状态: ${phase}`);
    }
  }
  
  // ========== Phase 1 处理函数 ==========
  
  /**
   * 1.1 上下文检索
   */
  private async handleContextRetrieval(): Promise<WorkflowPhase> {
    // ccq-engine 只负责检索，不做分析
    const context = await this.ccqEngine.retrieve({
      query: this.context.userRequest,
      topK: 15
    });
    
    // 归纳代码上下文为约束（LLM 归纳）
    const constraints = await this.summarizeConstraints(context);
    
    this.context.phaseData.codeContext = context;
    this.context.memory.constraints = constraints;
    
    return WorkflowPhase.PHASE1_ANALYST_SCORING;
  }
  
  /**
   * 1.2 需求评分
   * 
   * 必须调用 Analyst，代码保证不会跳过
   */
  private async handleAnalystScoring(): Promise<WorkflowPhase> {
    const result = await this.agents.call('analyst', {
      request: this.context.userRequest,
      constraints: this.context.memory.constraints,
      previousClarifications: this.context.phaseData.analystResult?.clarifications
    });
    
    this.context.phaseData.analystResult = result;
    
    // 计算阈值（根据复杂度自适应）
    const threshold = this.calculateScoreThreshold(result.complexity);
    
    if (result.score < threshold) {
      // 低于阈值，必须追问
      return WorkflowPhase.PHASE1_WAIT_USER_CLARIFICATION;
    }
    
    // 达到阈值，保存需求摘要到核心记忆
    this.context.memory.requirement = result.summarizedRequirement;
    
    return WorkflowPhase.PHASE1_SOLVER_DESIGN;
  }
  
  /**
   * 评分阈值自适应
   */
  private calculateScoreThreshold(complexity: 'low' | 'medium' | 'high'): number {
    switch (complexity) {
      case 'low': return 6;
      case 'medium': return 7;
      case 'high': return 8;
      default: return this.DEFAULT_SCORE_THRESHOLD;
    }
  }
  
  /**
   * 1.3 方案设计
   * 
   * 必须调用 Solver，代码保证不会跳过
   */
  private async handleSolverDesign(): Promise<WorkflowPhase> {
    const criticFeedback = this.context.phaseData.criticReview?.issues;
    
    const solution = await this.agents.call('solver', {
      requirement: this.context.memory.requirement,
      constraints: this.context.memory.constraints,
      previousSolution: this.context.phaseData.solverSolution,
      criticFeedback: criticFeedback
    });
    
    this.context.phaseData.solverSolution = solution;
    
    // 必须进入 Critic 审核
    return WorkflowPhase.PHASE1_CRITIC_REVIEW;
  }
  
  /**
   * 1.4 方案审核
   * 
   * 必须调用 Critic，代码保证不会跳过
   */
  private async handleCriticReview(): Promise<WorkflowPhase> {
    const review = await this.agents.call('critic', {
      solution: this.context.phaseData.solverSolution,
      requirement: this.context.memory.requirement,
      constraints: this.context.memory.constraints
    });
    
    this.context.phaseData.criticReview = review;
    
    if (review.passed) {
      // 通过，用户确认
      return WorkflowPhase.PHASE1_WAIT_USER_CONFIRM_PLAN;
    }
    
    // 检查迭代次数
    this.context.meta.retryCount++;
    
    if (this.context.meta.retryCount >= this.MAX_SOLVER_CRITIC_ROUNDS) {
      // 达到上限，强制用户介入
      return WorkflowPhase.PHASE1_WAIT_USER_CONFIRM_PLAN;
    }
    
    // 未通过，Solver 重做
    return WorkflowPhase.PHASE1_SOLVER_DESIGN;
  }
  
  // ========== Phase 3 处理函数 ==========
  
  /**
   * 3.1 选择下一个 Todo
   */
  private async handlePickTodo(): Promise<WorkflowPhase> {
    const todolist = this.context.phaseData.todolist;
    const nextTodo = todolist.getNextPending();
    
    if (!nextTodo) {
      // 所有 Todo 完成，进入交付
      return WorkflowPhase.PHASE4_FINAL_CHECK;
    }
    
    this.context.memory.currentTodo = nextTodo;
    this.context.meta.retryCount = 0; // 重置重试计数
    
    return WorkflowPhase.PHASE3_CODER_IMPLEMENT;
  }
  
  /**
   * 3.2 执行 Todo
   * 
   * 必须调用 Coder，代码保证不会跳过
   */
  private async handleCoderImplement(): Promise<WorkflowPhase> {
    const todo = this.context.memory.currentTodo;
    
    // 检索相关代码上下文
    const context = await this.ccqEngine.retrieve({
      query: todo.content,
      topK: 10
    });
    
    const changes = await this.agents.call('coder', {
      todo: todo,
      context: context,
      coreMemory: this.context.memory,
      previousChanges: this.context.phaseData.coderChanges,
      reviewerFeedback: this.context.phaseData.reviewerResult?.issues
    });
    
    this.context.phaseData.coderChanges = changes;
    
    // 必须进入 Reviewer 审核
    return WorkflowPhase.PHASE3_REVIEWER_CHECK;
  }
  
  /**
   * 3.3 代码审核
   * 
   * 必须调用 Reviewer，代码保证不会跳过
   */
  private async handleReviewerCheck(): Promise<WorkflowPhase> {
    const todo = this.context.memory.currentTodo;
    const changes = this.context.phaseData.coderChanges;
    
    const review = await this.agents.call('reviewer', {
      todo: todo,
      changes: changes,
      acceptanceCriteria: todo.acceptance
    });
    
    this.context.phaseData.reviewerResult = review;
    
    if (review.passed) {
      // 检查风险级别
      const riskLevel = this.assessRiskLevel(changes);
      
      if (riskLevel === 'high') {
        return WorkflowPhase.PHASE3_WAIT_USER_HIGH_RISK;
      }
      
      return WorkflowPhase.PHASE3_APPLY_CHANGES;
    }
    
    // 检查重试次数
    this.context.meta.retryCount++;
    
    if (this.context.meta.retryCount >= this.MAX_CODER_REVIEWER_ROUNDS) {
      // 达到上限，标记为 blocked，用户介入
      return WorkflowPhase.PHASE3_WAIT_USER_HIGH_RISK;
    }
    
    // 未通过，Coder 重做
    return WorkflowPhase.PHASE3_CODER_IMPLEMENT;
  }
  
  /**
   * 风险级别评估
   */
  private assessRiskLevel(changes: CodeChange[]): 'low' | 'medium' | 'high' {
    const totalLoc = changes.reduce((sum, c) => sum + c.linesChanged, 0);
    const fileCount = changes.length;
    
    const highRiskPaths = [
      'auth/', 'security/', 'migrations/', 'db/',
      'infra/', 'config/', '.github/workflows/', '.env'
    ];
    
    const touchesHighRisk = changes.some(c => 
      highRiskPaths.some(p => c.filePath.includes(p))
    );
    
    if (touchesHighRisk || totalLoc > 200 || fileCount > 8) {
      return 'high';
    }
    
    if (totalLoc > 50 || fileCount > 3) {
      return 'medium';
    }
    
    return 'low';
  }
  
  // ========== 辅助方法 ==========
  
  /**
   * 归纳代码检索结果为约束
   * 
   * 这是"需要理解"的场景，使用 LLM
   */
  private async summarizeConstraints(context: CodeChunk[]): Promise<string[]> {
    // 调用 LLM 归纳，而不是引入新 Agent
    // 使用 Orchestrator 内置的 LLM 调用能力
    const prompt = `
根据以下代码片段，提取项目约束：
${context.map(c => c.content).join('\n---\n')}

输出格式（JSON 数组）：
["约束1", "约束2", ...]

提取要点：
- 使用的框架和库
- 数据库和 ORM
- 命名规范
- 现有模式和工具函数
`;
    
    const result = await this.llmCall(prompt);
    return JSON.parse(result);
  }
  
  /**
   * 判断是否为终态
   */
  private isTerminalState(): boolean {
    return [
      WorkflowPhase.COMPLETED,
      WorkflowPhase.FAILED,
      WorkflowPhase.PAUSED
    ].includes(this.context.phase);
  }
  
  /**
   * 状态转换日志（审计留痕）
   */
  private async logTransition(phase: WorkflowPhase): Promise<void> {
    await this.memoryManager.appendTraceLog({
      timestamp: new Date().toISOString(),
      phase: phase,
      context: {
        retryCount: this.context.meta.retryCount,
        currentTodo: this.context.memory.currentTodo?.id
      }
    });
  }
}
```

### 3.2 用户交互处理

```typescript
// 文件: packages/ccq-workflow/src/orchestrator/user-interaction.ts

import { EventEmitter } from 'events';

export interface UserInteractionHandler {
  /**
   * 请求用户输入
   */
  requestInput(prompt: string, options?: InputOptions): Promise<string>;
  
  /**
   * 请求用户确认
   */
  requestConfirmation(summary: string): Promise<ConfirmationResult>;
  
  /**
   * 展示进度
   */
  showProgress(phase: string, message: string): void;
}

export interface InputOptions {
  type: 'text' | 'choice';
  choices?: string[];
  default?: string;
  timeout?: number;
}

export interface ConfirmationResult {
  confirmed: boolean;
  adjustments?: string;
}

/**
 * CLI 实现
 */
export class CliInteractionHandler implements UserInteractionHandler {
  async requestInput(prompt: string, options?: InputOptions): Promise<string> {
    // 使用 inquirer 或类似库实现
    console.log(`\n📋 ${prompt}\n`);
    
    if (options?.choices) {
      // 展示选项
      options.choices.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
    }
    
    // 读取用户输入...
    return this.readLine();
  }
  
  async requestConfirmation(summary: string): Promise<ConfirmationResult> {
    console.log(`\n📝 方案摘要:\n${summary}\n`);
    console.log('请选择: [C]onfirm 确认 / [A]djust 调整 / [R]eject 拒绝');
    
    const input = await this.readLine();
    
    switch (input.toLowerCase()) {
      case 'c':
      case 'confirm':
        return { confirmed: true };
        
      case 'a':
      case 'adjust':
        const adjustments = await this.requestInput('请输入调整意见:');
        return { confirmed: false, adjustments };
        
      case 'r':
      case 'reject':
        return { confirmed: false };
        
      default:
        // 默认确认
        return { confirmed: true };
    }
  }
  
  showProgress(phase: string, message: string): void {
    console.log(`[${phase}] ${message}`);
  }
  
  private async readLine(): Promise<string> {
    // 实现标准输入读取
    return '';
  }
}

/**
 * MCP 实现（供 AI 编辑器调用）
 */
export class McpInteractionHandler implements UserInteractionHandler {
  private eventEmitter: EventEmitter;
  private pendingRequests: Map<string, (value: string) => void>;
  
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.pendingRequests = new Map();
  }
  
  async requestInput(prompt: string, options?: InputOptions): Promise<string> {
    const requestId = this.generateRequestId();
    
    // 发送 MCP 消息给客户端
    this.emitMcpMessage({
      type: 'user_input_required',
      requestId,
      prompt,
      options
    });
    
    // 等待响应
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, resolve);
    });
  }
  
  async requestConfirmation(summary: string): Promise<ConfirmationResult> {
    const input = await this.requestInput(summary, {
      type: 'choice',
      choices: ['确认', '调整', '拒绝']
    });
    
    // 解析响应...
    return { confirmed: input === '确认' };
  }
  
  showProgress(phase: string, message: string): void {
    this.emitMcpMessage({
      type: 'progress_update',
      phase,
      message
    });
  }
  
  /**
   * 接收用户响应（由 MCP 客户端调用）
   */
  handleUserResponse(requestId: string, response: string): void {
    const resolver = this.pendingRequests.get(requestId);
    if (resolver) {
      resolver(response);
      this.pendingRequests.delete(requestId);
    }
  }
  
  private emitMcpMessage(message: any): void {
    // MCP 消息发送逻辑
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## 4. 文件结构

```
packages/ccq-workflow/src/
├── orchestrator/
│   ├── index.ts                 # 导出入口
│   ├── types.ts                 # 类型定义
│   ├── orchestrator.ts          # 状态机核心
│   ├── user-interaction.ts      # 用户交互处理
│   └── transitions.ts           # 状态转换配置
```

---

## 5. 验收标准

| 检查项 | 说明 | 通过条件 |
|--------|------|----------|
| **必经节点不可跳过** | Analyst/Solver/Critic/Reviewer 必须执行 | 无条件分支绕过这些 Agent |
| **状态持久化** | 中断后可恢复 | context 可序列化/反序列化 |
| **阶段输出一致** | request.md/todolist.md 正确生成 | 输出文件符合格式规范 |
| **用户介入点正确** | 只在设计的位置等待用户 | 无意外阻塞 |
| **审计日志完整** | 每次状态转换都有记录 | trace.jsonl 包含完整轨迹 |

---

## 6. 依赖模块

| 依赖 | 说明 |
|------|------|
| `@ccq/engine` | 代码上下文检索 |
| `./agents/registry` | Agent 注册与调用 |
| `./memory/manager` | Memory 管理 |
| `./files/manager` | 文件读写（含拦截器） |

---

## 7. 测试要点

```typescript
describe('Orchestrator', () => {
  describe('状态转换', () => {
    it('should always call Analyst before Solver', async () => {
      // 验证 Analyst 必须在 Solver 之前被调用
    });
    
    it('should always call Critic after Solver', async () => {
      // 验证 Solver 之后必须调用 Critic
    });
    
    it('should retry Solver when Critic rejects', async () => {
      // 验证 Critic 拒绝后 Solver 重做
    });
    
    it('should escalate to user after max retries', async () => {
      // 验证达到重试上限后用户介入
    });
  });
  
  describe('风险评估', () => {
    it('should mark high-risk for auth paths', async () => {
      // 验证涉及 auth/ 路径为高风险
    });
    
    it('should mark high-risk for large changes', async () => {
      // 验证大改动为高风险
    });
  });
});
```
