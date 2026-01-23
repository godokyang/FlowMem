/**
 * Orchestrator 状态转换配置
 *
 * 定义 25 个工作流状态之间的转换规则
 */

import { WorkflowPhase } from './types';

/**
 * 状态转换规则
 */
export interface TransitionRule {
  fromPhase: WorkflowPhase;
  toPhase: WorkflowPhase;
  requiresConfirmation: boolean;
  requiresData?: string[];
}

/**
 * 状态转换表
 */
export const TRANSITIONS: TransitionRule[] = [
  // ========== 初始状态转换 ==========

  // init -> phase1 阶段
  {
    fromPhase: 'init',
    toPhase: 'phase1.start',
    requiresConfirmation: false,
    requiresData: ['request']
  },
  {
    fromPhase: 'init',
    toPhase: 'phase1.code_retrieval',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'init',
    toPhase: 'phase1.analyst_scoring',
    requiresConfirmation: false,
    requiresData: ['codeContext']
  },
  {
    fromPhase: 'init',
    toPhase: 'phase1.solver_design',
    requiresConfirmation: false,
    requiresData: ['clarifiedRequirements']
  },
  {
    fromPhase: 'init',
    toPhase: 'phase1.critic_review',
    requiresConfirmation: false,
    requiresData: ['solution', 'criticIssues']
  },
  {
    fromPhase: 'init',
    toPhase: 'phase1.solution_confirm',
    requiresConfirmation: true,
    requiresData: ['solution']
  },

  // ========== Phase 1 内部转换 ==========

  {
    fromPhase: 'phase1.start',
    toPhase: 'phase1.code_retrieval',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.code_retrieval',
    toPhase: 'phase1.analyst_scoring',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.analyst_scoring',
    toPhase: 'phase1.analyst_scoring',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.analyst_scoring',
    toPhase: 'phase1.solver_design',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.code_retrieval',
    toPhase: 'phase1.solver_design',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.solver_design',
    toPhase: 'phase1.critic_review',
    requiresConfirmation: false,
    requiresData: []
  },

  {
    fromPhase: 'phase1.critic_review',
    toPhase: 'phase1.solution_confirm',
    requiresConfirmation: true,
    requiresData: ['solution']
  },

  // ========== Phase 1 -> Phase 2 转换 ==========

  {
    fromPhase: 'phase1.solution_confirm',
    toPhase: 'phase2.planner_start',
    requiresConfirmation: true,
    requiresData: ['chosenPlan', 'coreMemory']
  },
  {
    fromPhase: 'phase1.solution_confirm',
    toPhase: 'phase2.planner_start',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.critic_review',
    toPhase: 'phase2.planner_start',
    requiresConfirmation: false,
    requiresData: []
  },

  // ========== Phase 1 -> Phase 3 转换 ==========

  {
    fromPhase: 'phase2.planner_start',
    toPhase: 'phase3.start',
    requiresConfirmation: false,
    requiresData: ['todoList']
  },
  {
    fromPhase: 'phase3.start',
    toPhase: 'phase3.code_retrieval',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase3.start',
    toPhase: 'phase3.coder_implementation',
    requiresConfirmation: false,
    requiresData: ['todoItem', 'context']
  },
  {
    fromPhase: 'phase3.coder_implementation',
    toPhase: 'phase3.reviewer_audit',
    requiresConfirmation: false,
    requiresData: ['changes', 'acceptanceCriteria']
  },
  {
    fromPhase: 'phase3.reviewer_audit',
    toPhase: 'phase3.user_confirm',
    requiresConfirmation: true,
    requiresData: ['reviewerOutput']
  },

  // ========== Phase 3 -> Phase 4 转换 ==========

  {
    fromPhase: 'phase3.user_confirm',
    toPhase: 'phase4.start',
    requiresConfirmation: false,
    requiresData: ['testResults']
  },
  {
    fromPhase: 'phase3.reviewer_audit',
    toPhase: 'phase4.start',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase4.start',
    toPhase: 'phase4.test_complete',
    requiresConfirmation: false,
    requiresData: []
  },

  // ========== Phase 4 -> 终态转换 ==========

  {
    fromPhase: 'phase4.test_complete',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },

  // ========== 终态状态转换 ==========

  {
    fromPhase: 'phase1.start',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.code_retrieval',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.analyst_scoring',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.solver_design',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.critic_review',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase1.solution_confirm',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase2.planner_start',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase3.start',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase3.code_retrieval',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase3.coder_implementation',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase3.reviewer_audit',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase3.user_confirm',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase4.start',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  },
  {
    fromPhase: 'phase4.test_complete',
    toPhase: 'completed',
    requiresConfirmation: false,
    requiresData: []
  }
];

/**
 * 获取状态转换规则
 */
export function getTransitions(fromPhase: WorkflowPhase): TransitionRule[] {
  return TRANSITIONS.filter(t => t.fromPhase === fromPhase);
}
