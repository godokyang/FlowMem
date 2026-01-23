/**
 * Context 类型定义
 */

/**
 * 代码上下文检索接口
 */
export interface ContextRetriever {
  /**
   * 检索相关代码
   */
  retrieve(query: ContextQuery): Promise<ContextResult>;

  /**
   * 是否可用
   */
  isAvailable(): boolean;
}

/**
 * 上下文查询
 */
export interface ContextQuery {
  /**
   * 查询文本
   */
  text: string;

  /**
   * 最大 token 数
   */
  maxTokens?: number;

  /**
   * 相关文件过滤
   */
  fileFilters?: string[];
}

/**
 * 上下文检索结果
 */
export interface ContextResult {
  /**
   * 相关代码片段
   */
  chunks: CodeChunk[];

  /**
   * 使用的 token 数
   */
  tokensUsed: number;
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
  relevanceScore?: number;
}
