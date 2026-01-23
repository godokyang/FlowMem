/**
 * LLM 客户端类型定义
 *
 * 提供统一的 LLM 调用接口，支持多种提供商
 */

/**
 * LLM 提供商类型
 */
export type LLMProvider = 'openrouter' | 'gemini' | 'openai' | 'anthropic';

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * LLM 配置
 */
export interface LLMConfig {
  /**
   * LLM 提供商
   */
  provider: LLMProvider;

  /**
   * API 密钥
   */
  apiKey: string;

  /**
   * 模型名称
   */
  model: string;

  /**
   * API 基础 URL（可选，用于自定义端点）
   */
  baseURL?: string;

  /**
   * 请求超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 最大重试次数
   */
  maxRetries?: number;

  /**
   * 自定义请求头
   */
  headers?: Record<string, string>;
}

/**
 * 完成请求参数
 */
export interface CompletionRequest {
  /**
   * 消息列表
   */
  messages: ChatMessage[];

  /**
   * 温度参数（0-2）
   * - 0: 更确定性和一致性
   * - 1: 更创造性和随机性
   */
  temperature?: number;

  /**
   * 最大生成 token 数
   */
  maxTokens?: number;

  /**
   * 停止序列
   */
  stop?: string[];

  /**
   * Top P 采样（0-1）
   */
  topP?: number;

  /**
   * 频率惩罚（-2.0 到 2.0）
   */
  frequencyPenalty?: number;

  /**
   * 存在惩罚（-2.0 到 2.0）
   */
  presencePenalty?: number;
}

/**
 * Token 使用统计
 */
export interface TokenUsage {
  /**
   * 输入 token 数
   */
  input: number;

  /**
   * 输出 token 数
   */
  output: number;

  /**
   * 总 token 数
   */
  total: number;
}

/**
 * 完成响应
 */
export interface CompletionResponse {
  /**
   * 生成的文本内容
   */
  content: string;

  /**
   * 使用的模型
   */
  model: string;

  /**
   * Token 使用统计
   */
  usage: TokenUsage;

  /**
   * 完成原因（stop/length）
   */
  finishReason: 'stop' | 'length' | 'content_filter';

  /**
   * 响应 ID
   */
  id?: string;

  /**
   * 创建时间戳
   */
  created?: number;
}

/**
 * LLM 客户端接口
 */
export interface ILLMClient {
  /**
   * 发送完成请求
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig;
}

/**
 * LLM 错误类型
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * 默认配置
 */
export const DEFAULT_LLM_CONFIG: Partial<LLMConfig> = {
  timeout: 60000, // 60 秒
  maxRetries: 3
};

/**
 * 默认完成请求参数
 */
export const DEFAULT_COMPLETION_PARAMS: Partial<CompletionRequest> = {
  temperature: 0.7,
  maxTokens: 4096
};

/**
 * 预定义模型
 */
export const PREDEFINED_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-haiku',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'google/gemini-pro-1.5'
  ],
  gemini: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
  ]
};
