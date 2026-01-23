/**
 * 拦截器类型定义
 */

/**
 * 受保护文件配置
 */
export interface ProtectedFileConfig {
  /**
   * 受保护的文件路径列表（相对于项目根目录）
   */
  paths: string[];

  /**
   * 受保护的路径模式（glob）
   */
  patterns: string[];

  /**
   * 高风险路径（需要用户确认）
   */
  highRiskPaths: string[];
}

/**
 * 写入请求
 */
export interface WriteRequest {
  filePath: string;
  content: string;
  operation: 'create' | 'modify' | 'delete';
  source: WriteSource;
}

/**
 * 写入来源
 */
export interface WriteSource {
  type: 'cli' | 'mcp' | 'direct' | 'agent';
  agentName?: string;
  todoId?: string;
  timestamp: Date;
}

/**
 * 拦截结果
 */
export interface InterceptResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * 审计记录
 */
export interface AuditRecord {
  id: string;
  timestamp: string;
  operation: 'create' | 'modify' | 'delete' | 'read';
  filePath: string;
  source: WriteSource;
  result: 'allowed' | 'blocked' | 'confirmed';
  details?: {
    linesChanged?: number;
    contentHash?: string;
    reason?: string;
  };
}

/**
 * 受保护文件写入错误
 */
export class ProtectedFileError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: string
  ) {
    super(`写入被拒绝: ${reason}`);
    this.name = 'ProtectedFileError';
  }
}

/**
 * 需要确认的高风险操作错误
 */
export class HighRiskOperationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly operation: string
  ) {
    super(`高风险操作需要用户确认: ${operation} ${filePath}`);
    this.name = 'HighRiskOperationError';
  }
}
