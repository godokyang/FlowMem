/**
 * Orchestrator 状态机类型定义
 *
 * 工作流状态（25 个状态）
 */

/**
 * 工作流状态（25 个状态）
 */
export type WorkflowPhase =
  // 初始状态
  | 'init'

  // Phase 1: 需求澄清与技术方案
  | 'phase1.start'
  | 'phase1.code_retrieval'
  | 'phase1.analyst_scoring'
  | 'phase1.solver_design'
  | 'phase1.critic_review'
  | 'phase1.solution_confirm'

  // Phase 2: 任务规划
  | 'phase2.planner_start'
  | 'phase2.planner_iteration'
  | 'phase2.todolist_confirm'

  // Phase 3: 代码实现
  | 'phase3.start'
  | 'phase3.code_retrieval'
  | 'phase3.coder_implementation'
  | 'phase3.reviewer_audit'
  | 'phase3.user_confirm'
  | 'phase3.todo_complete'

  // Phase 4: 测试验证
  | 'phase4.start'
  | 'phase4.test_execution'
  | 'phase4.test_complete'

  // 终态
  | 'completed'
  | 'paused'
  | 'failed'
  | 'archived';

/**
 * 状态元数据
 */
export interface StateMetadata {
  phase: WorkflowPhase;
  timestamp: string;
  durationMs?: number;
  agent?: string;
  data?: Record<string, any>;
}

/**
 * 用户交互事件
 */
export interface UserInteraction {
  type: 'confirmation' | 'input' | 'cancellation';
  data: any;
  timestamp: string;
}

/**
 * 决策类型
 */
export type DecisionType = 'plan_confirm' | 'todo_confirm' | 'high_risk_confirm';

/**
 * 决策记录
 */
export interface Decision {
  id: string;
  type: DecisionType;
  summary: string;
  details: string;
  timestamp: string;
  outcome: 'approved' | 'rejected' | 'adjusted';
}

/**
 * Orchestrator 配置
 */
export interface OrchestratorConfig {
  projectRoot: string;
  llmClient: import('../llm').LLMClient;
  agentRegistry: import('../agents').AgentRegistry;
  memoryManager: import('../memory').MemoryManager;
  contextRetrieverFactory: import('../context').RetrieverFactory;
  debugMode: boolean;
  onStateChange?: (state: StateMetadata) => void;
}

/**
 * 状态转换结果
 */
export interface TransitionResult {
  nextPhase: WorkflowPhase;
  nextState: string;
  requiresConfirmation: boolean;
  message?: string;
}
