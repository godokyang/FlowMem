/**
 * Memory 类型定义
 */

/**
 * 核心记忆 - 跨阶段持久化
 */
export interface CoreMemory {
  requirement: string;
  acceptanceCriteria: string[];
  constraints: string[];
  chosenPlan: string;
  currentTodo?: import('../agents/types').TodoItem;
}

/**
 * 阶段记忆 - 阶段内保留
 */
export interface PhaseMemory {
  phase: WorkflowPhase;
  startTime: Date;
  data?: Record<string, any>;
  stateMetadata?: import('../orchestrator/types').StateMetadata;
  codeContext?: any;
  analystResult?: any;
  plannerOutput?: any;
  todolist?: any;
  coderOutput?: any;
  reviewerOutput?: any;
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
 *
 * 使用与 orchestrator 一致的详细状态定义
 */
export type WorkflowPhase = import('../orchestrator/types').WorkflowPhase;

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

/**
 * 测试结果
 */
export interface TestResult {
  testName: string;
  passed: boolean;
  output?: string;
  error?: string;
}
