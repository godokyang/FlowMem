/**
 * FlowMem Workflow 核心类型定义
 */

// Todo 状态
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

// Todo 优先级
export type TodoPriority = 'critical' | 'high' | 'medium' | 'low';

// Todo 项
export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  priority: TodoPriority;
  phase?: number;
  dependencies?: string[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
  retry_count?: number;
  notes?: string;
}

// Todolist 文件结构
export interface TodolistFile {
  frontmatter: {
    created_at: string;
    updated_at: string;
    request_id: string;
    total_todos: number;
    completed_todos: number;
    current_phase: number;
  };
  todos: TodoItem[];
}

// Session 状态
export interface SessionState {
  session_id: string;
  created_at: string;
  updated_at: string;
  current_phase: number;
  current_todo_id: string | null;
  retry_count: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  checkpoints: Checkpoint[];
}

// 检查点
export interface Checkpoint {
  phase: number;
  todo_id: string;
  timestamp: string;
  git_ref?: string;
}

// 项目配置
export interface ProjectConfig {
  name: string;
  tech_stack: string[];
  workflow: {
    risk: {
      high_paths: string[];
      protected_files: string[];
    };
    tests: {
      primary: string[];
      secondary?: string[];
    };
    lazy_patterns?: string[];
  };
}

// 审核结果
export interface AuditResult {
  type: 'debt' | 'sync' | 'todo' | 'lazy' | 'risk';
  passed: boolean;
  message: string;
  details?: string[];
  severity: 'error' | 'warning' | 'info';
}

// Guard 检查结果
export interface GuardCheckResult {
  allowed: boolean;
  reason?: string;
  file?: string;
  rule?: string;
}
