/**
 * LLM 客户端实现
 *
 * 支持多种 LLM 提供商：OpenRouter、Gemini、OpenAI、Anthropic
 */

import {
  ILLMClient,
  LLMConfig,
  CompletionRequest,
  CompletionResponse,
  LLMError,
  DEFAULT_LLM_CONFIG,
  DEFAULT_COMPLETION_PARAMS,
  LLMProvider
} from './types';

/**
 * LLM 客户端类
 */
export class LLMClient implements ILLMClient {
  private config: Required<LLMConfig>;

  constructor(config: Partial<LLMConfig>) {
    // 合并默认配置
    this.config = {
      ...DEFAULT_LLM_CONFIG,
      ...config,
      provider: config.provider || 'openrouter',
      model: config.model || 'anthropic/claude-3.5-sonnet',
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      baseURL: config.baseURL || this.getDefaultBaseURL(config.provider || 'openrouter'),
      headers: config.headers || {}
    } as Required<LLMConfig>;
  }

  /**
   * 获取默认 API 基础 URL
   */
  private getDefaultBaseURL(provider: LLMProvider): string {
    const urls: Record<LLMProvider, string> = {
      openrouter: 'https://openrouter.ai/api/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1'
    };
    return urls[provider];
  }

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * 发送完成请求
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // 合并默认参数
    const mergedRequest: CompletionRequest = {
      ...DEFAULT_COMPLETION_PARAMS,
      ...request,
      messages: request.messages
    };

    let lastError: Error | null = null;

    // 重试逻辑
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.sendRequest(mergedRequest);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 判断是否需要重试
        if (attempt < this.config.maxRetries && this.shouldRetry(lastError)) {
          // 指数退避
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new LLMError(
      `请求失败，已重试 ${this.config.maxRetries} 次: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED'
    );
  }

  /**
   * 判断错误是否可以重试
   */
  private shouldRetry(error: Error): boolean {
    if (!(error instanceof LLMError)) {
      return false;
    }

    // 可重试的 HTTP 状态码
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    return error.statusCode ? retryableStatusCodes.includes(error.statusCode) : false;
  }

  /**
   * 发送 HTTP 请求
   */
  private async sendRequest(request: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const url = this.buildURL();
      const body = this.buildRequestBody(request);
      const headers = this.buildHeaders();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        throw new LLMError(
          `API 请求失败: ${response.status} ${response.statusText}`,
          'API_ERROR',
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return this.parseResponse(data);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMError('请求超时', 'TIMEOUT_ERROR', 408);
      }

      throw error;
    }
  }

  /**
   * 构建请求 URL
   */
  private buildURL(): string {
    switch (this.config.provider) {
      case 'gemini':
        return `${this.config.baseURL}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      case 'openrouter':
      case 'openai':
        return `${this.config.baseURL}/chat/completions`;
      case 'anthropic':
        return `${this.config.baseURL}/messages`;
      default:
        return `${this.config.baseURL}/chat/completions`;
    }
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: CompletionRequest): any {
    switch (this.config.provider) {
      case 'gemini':
        return this.buildGeminiRequestBody(request);
      case 'openrouter':
      case 'openai':
        return this.buildOpenAIRequestBody(request);
      case 'anthropic':
        return this.buildAnthropicRequestBody(request);
      default:
        return this.buildOpenAIRequestBody(request);
    }
  }

  /**
   * 构建 Gemini 请求体
   */
  private buildGeminiRequestBody(request: CompletionRequest): any {
    const contents = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    return {
      contents,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP,
        stopSequences: request.stop
      }
    };
  }

  /**
   * 构建 OpenAI 格式请求体（OpenRouter 兼容）
   */
  private buildOpenAIRequestBody(request: CompletionRequest): any {
    return {
      model: this.config.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stop: request.stop,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty
    };
  }

  /**
   * 构建 Anthropic 请求体
   */
  private buildAnthropicRequestBody(request: CompletionRequest): any {
    // Anthropic API 的 messages 格式略有不同
    const messages = request.messages.filter(msg => msg.role !== 'system');
    const system = request.messages.find(msg => msg.role === 'system')?.content;

    return {
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      system: system,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      top_p: request.topP,
      stop_sequences: request.stop
    };
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    switch (this.config.provider) {
      case 'gemini':
        // Gemini 使用 URL 参数传递 API key
        break;
      case 'anthropic':
        headers['x-api-key'] = this.config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'openrouter':
      case 'openai':
      default:
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        if (this.config.provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://flowmem.dev';
          headers['X-Title'] = 'FlowMem Workflow Engine';
        }
        break;
    }

    return headers;
  }

  /**
   * 解析响应
   */
  private parseResponse(data: any): CompletionResponse {
    switch (this.config.provider) {
      case 'gemini':
        return this.parseGeminiResponse(data);
      case 'openrouter':
      case 'openai':
        return this.parseOpenAIResponse(data);
      case 'anthropic':
        return this.parseAnthropicResponse(data);
      default:
        return this.parseOpenAIResponse(data);
    }
  }

  /**
   * 解析 Gemini 响应
   */
  private parseGeminiResponse(data: any): CompletionResponse {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new LLMError('Gemini API 返回空响应', 'EMPTY_RESPONSE');
    }

    const content = candidate.content?.parts?.[0]?.text || '';
    const finishReason = candidate.finishReason;

    return {
      content,
      model: this.config.model,
      usage: {
        input: data.usageMetadata?.promptTokenCount || 0,
        output: data.usageMetadata?.candidatesTokenCount || 0,
        total: (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0)
      },
      finishReason: finishReason === 'STOP' ? 'stop' : 'length',
      id: data.id
    };
  }

  /**
   * 解析 OpenAI 格式响应（OpenRouter 兼容）
   */
  private parseOpenAIResponse(data: any): CompletionResponse {
    const choice = data.choices?.[0];
    if (!choice) {
      throw new LLMError('API 返回空响应', 'EMPTY_RESPONSE');
    }

    return {
      content: choice.message?.content || '',
      model: data.model,
      usage: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      },
      finishReason: choice.finish_reason,
      id: data.id,
      created: data.created
    };
  }

  /**
   * 解析 Anthropic 响应
   */
  private parseAnthropicResponse(data: any): CompletionResponse {
    if (data.type === 'error') {
      throw new LLMError(data.error?.message || 'Anthropic API 错误', 'API_ERROR', undefined, data);
    }

    const contentBlock = data.content?.[0];
    if (!contentBlock || contentBlock.type !== 'text') {
      throw new LLMError('Anthropic API 返回无效内容', 'INVALID_RESPONSE');
    }

    return {
      content: contentBlock.text,
      model: data.model,
      usage: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      finishReason: data.stop_reason || 'stop',
      id: data.id
    };
  }
}
