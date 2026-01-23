import { AnalystAgent } from '../../src/agents/analyst';
import { LLMClient } from '../../src/llm/client';
import { AnalystInput } from '../../src/agents/types';

// Mock LLMClient
jest.mock('../../src/llm/client');

describe('AnalystAgent', () => {
  let agent: AnalystAgent;
  let mockLLMClient: jest.Mocked<LLMClient>;

  beforeEach(() => {
    mockLLMClient = new LLMClient({}) as any;
    agent = new AnalystAgent(mockLLMClient);
  });

  it('should parse valid JSON output', async () => {
    const input: AnalystInput = {
      request: '实现一个登录功能',
      constraints: []
    };

    const content = JSON.stringify({
      score: 8,
      complexity: 'medium',
      summarizedRequirement: '登录功能',
      clarifiedPoints: ['JWT认证'],
      unclearPoints: [],
      questions: []
    });

    const mockResponse = {
      content: `\`\`\`json\n${content}\n\`\`\``,
      usage: { input: 10, output: 20, total: 30 },
      model: 'test-model',
      finishReason: 'stop'
    };

    mockLLMClient.complete.mockResolvedValue(mockResponse as any);

    const result = await agent.execute(input);

    expect(result.score).toBe(8);
    expect(result.complexity).toBe('medium');
    expect(result.tokensUsed).toEqual({ input: 10, output: 20 });
  });

  it('should handle invalid JSON output', async () => {
    const input: AnalystInput = {
      request: '测试',
      constraints: []
    };

    mockLLMClient.complete.mockResolvedValue({
      content: 'invalid json',
      usage: { input: 0, output: 0, total: 0 }
    } as any);

    await expect(agent.execute(input)).rejects.toThrow();
  });
});
