import { Orchestrator } from '../../src/orchestrator/orchestrator';
import { LLMClient } from '../../src/llm/client';
import { MemoryManager } from '../../src/memory/manager';
import { AgentRegistry } from '../../src/agents/registry';
import { AnalystAgent, SolverAgent, CriticAgent, PlannerAgent, CoderAgent, ReviewerAgent } from '../../src/agents';
import { UserInteractionHandler } from '../../src/orchestrator/user-interaction';

jest.mock('../../src/llm/client');
jest.mock('../../src/orchestrator/user-interaction');
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{}'),
}));

describe('E2E Workflow', () => {
  let orchestrator: Orchestrator;
  let mockLLMClient: any;
  let mockUI: any;

  beforeEach(() => {
    mockLLMClient = new LLMClient({});
    mockLLMClient.complete = jest.fn().mockImplementation(async (req) => {
      // 简单的模拟响应
      const content = JSON.stringify({
        score: 8,
        complexity: 'medium',
        summarizedRequirement: 'Test Requirement',
        clarifiedPoints: ['Point 1'],
        unclearPoints: [],
        questions: [],
        solution: { title: 'Test Solution', components: [], overview: '', architecture: '', dataFlow: '', risks: [], assumptions: [] },
        passed: true,
        confidence: 100,
        todolist: { todos: [], executionOrder: [], meta: { requestRef: '', totalPoints: 0, estimatedHours: 0 } },
        changes: [],
        explanation: 'Done',
        issues: [],
        strengths: []
      });

      return {
        content: `\`\`\`json\n${content}\n\`\`\``,
        usage: { input: 0, output: 0, total: 0 }
      };
    });

    mockUI = new UserInteractionHandler();
    mockUI.confirm.mockResolvedValue(true);
    mockUI.handleAnalystQuestion.mockResolvedValue('answer');

    const memoryManager = new MemoryManager('/tmp', mockLLMClient);
    const agentRegistry = new AgentRegistry(mockLLMClient);
    
    // Register agents
    agentRegistry.register(new AnalystAgent(mockLLMClient));
    agentRegistry.register(new SolverAgent(mockLLMClient));
    agentRegistry.register(new CriticAgent(mockLLMClient));
    agentRegistry.register(new PlannerAgent(mockLLMClient));
    agentRegistry.register(new CoderAgent(mockLLMClient));
    agentRegistry.register(new ReviewerAgent(mockLLMClient));

    orchestrator = new Orchestrator({
      projectRoot: '/tmp',
      llmClient: mockLLMClient,
      agentRegistry,
      memoryManager,
      contextRetrieverFactory: { create: jest.fn().mockResolvedValue({ retrieve: jest.fn().mockResolvedValue({ chunks: [] }) }) } as any,
      debugMode: false
    });

    // Inject mock UI
    (orchestrator as any).ui = mockUI;
  });

  it('should run through phase 1', async () => {
    await orchestrator.runWorkflow('Test Request');
    
    expect(mockLLMClient.complete).toHaveBeenCalled();
    expect(orchestrator.getCurrentPhase()).toBe('completed');
  });
});
