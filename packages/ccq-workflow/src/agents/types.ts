/**
 * Agent 类型定义
 */

import { CompletionResponse } from '../llm/types';

/**
 * Agent 基础输入
 */
export interface AgentInput {
  /**
   * 核心记忆（跨阶段共享）
   */
  coreMemory?: CoreMemory;

  /**
   * 特定 Agent 的输入参数
   */
  [key: string]: any;
}

/**
 * Agent 基础输出
 */
export interface AgentOutput {
  /**
   * Agent 名称
   */
  agent: string;

  /**
   * 执行耗时
   */
  durationMs: number;

  /**
   * Token 使用
   */
  tokensUsed: {
    input: number;
    output: number;
  };

  /**
   * 特定 Agent 的输出
   */
  [key: string]: any;
}

/**
 * Agent 接口
 */
export interface Agent<TInput extends AgentInput, TOutput extends AgentOutput> {
  /**
   * Agent 名称
   */
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
 * 代码片段
 */
export interface CodeChunk {
  filePath: string;
  language: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

/**
 * 工作流阶段
 */
export type WorkflowPhase =
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4';

// ============ Analyst Agent 类型 ============

/**
 * Analyst 输入
 */
export interface AnalystInput extends AgentInput {
  request: string;
  constraints: string[];
  previousClarifications?: string[];
}

/**
 * Analyst 输出
 */
export interface AnalystOutput extends AgentOutput {
  score: number;
  complexity: 'low' | 'medium' | 'high';
  summarizedRequirement: string;
  clarifiedPoints: string[];
  unclearPoints: string[];
  questions: ClarificationQuestion[];
}

/**
 * 澄清问题
 */
export interface ClarificationQuestion {
  dimension: 'goal' | 'outcome' | 'boundary' | 'constraint';
  question: string;
  options?: string[];
  default?: string;
}

// ============ Solver Agent 类型 ============

/**
 * Solver 输入
 */
export interface SolverInput extends AgentInput {
  requirement: string;
  constraints: string[];
  previousSolution?: Solution;
  criticFeedback?: CriticIssue[];
}

/**
 * Solver 输出
 */
export interface SolverOutput extends AgentOutput {
  solution: Solution;
}

/**
 * 技术方案
 */
export interface Solution {
  title: string;
  overview: string;
  architecture: string;
  components: ComponentSpec[];
  dataFlow: string;
  risks: string[];
  assumptions: string[];
}

/**
 * 组件规范
 */
export interface ComponentSpec {
  name: string;
  type: 'api' | 'service' | 'model' | 'util' | 'ui';
  responsibility: string;
  dependencies: string[];
}

// ============ Critic Agent 类型 ============

/**
 * Critic 输入
 */
export interface CriticInput extends AgentInput {
  solution: Solution;
  requirement: string;
  constraints: string[];
}

/**
 * Critic 输出
 */
export interface CriticOutput extends AgentOutput {
  passed: boolean;
  confidence: number;
  issues: CriticIssue[];
  strengths: string[];
}

/**
 * Critic 问题
 */
export interface CriticIssue {
  type: 'direction' | 'feasibility' | 'completeness' | 'risk' | 'compatibility';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  impact: string;
  suggestion: string;
}

// ============ Planner Agent 类型 ============

/**
 * Planner 输入
 */
export interface PlannerInput extends AgentInput {
  requirement: string;
  chosenPlan: string;
}

/**
 * Planner 输出
 */
export interface PlannerOutput extends AgentOutput {
  todolist: TodoList;
}

/**
 * Todo 列表
 */
export interface TodoList {
  meta: {
    requestRef: string;
    totalPoints: number;
    estimatedHours: number;
  };
  todos: TodoItem[];
  executionOrder: string[][];
}

/**
 * Todo 项
 */
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  points: number;
  dependsOn: string[];
  acceptance: string[];
  files: string[];
}

// ============ Coder Agent 类型 ============

/**
 * Coder 输入
 */
export interface CoderInput extends AgentInput {
  todo: TodoItem;
  context: CodeChunk[];
  previousChanges?: CodeChange[];
  reviewerFeedback?: ReviewerIssue[];
}

/**
 * Coder 输出
 */
export interface CoderOutput extends AgentOutput {
  changes: CodeChange[];
  explanation: string;
}

/**
 * 代码变更
 */
export interface CodeChange {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
  linesChanged: number;
}

// ============ Reviewer Agent 类型 ============

/**
 * Reviewer 输入
 */
export interface ReviewerInput extends AgentInput {
  todo: TodoItem;
  changes: CodeChange[];
  acceptanceCriteria: string[];
}

/**
 * Reviewer 输出
 */
export interface ReviewerOutput extends AgentOutput {
  passed: boolean;
  acceptanceResults: AcceptanceResult[];
  issues: ReviewerIssue[];
  lazyCodeDetected: boolean;
}

/**
 * 验收结果
 */
export interface AcceptanceResult {
  criterion: string;
  met: boolean;
  evidence?: string;
}

/**
 * Reviewer 问题
 */
export interface ReviewerIssue {
  type: 'lazy_code' | 'type_error' | 'missing_error_handling' |
        'acceptance_not_met' | 'code_style' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location?: string;
  suggestion: string;
}
