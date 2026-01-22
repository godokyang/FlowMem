export interface LLMClient {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
