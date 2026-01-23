import { Orchestrator } from '../../src/orchestrator/orchestrator';
import { LLMClient } from '../../src/llm/client';
import { MemoryManager } from '../../src/memory/manager';
import { AgentRegistry } from '../../src/agents/registry';
import { RetrieverFactory } from '../../src/context/factory';

// Mock dependencies
jest.mock('../../src/llm/client');
jest.mock('../../src/memory/manager');
jest.mock('../../src/agents/registry');
jest.mock('../../src/context/factory');

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let mockLLMClient: any;
  let mockMemoryManager: any;
  let mockAgentRegistry: any;

  beforeEach(() => {
    mockLLMClient = new LLMClient({});
    mockMemoryManager = new MemoryManager('/root', mockLLMClient);
    mockAgentRegistry = new AgentRegistry(mockLLMClient);
    
    // Setup mocks
    mockMemoryManager.updateCoreMemory = jest.fn().mockResolvedValue(undefined);
    (RetrieverFactory.create as jest.Mock).mockResolvedValue({});

    orchestrator = new Orchestrator({
      projectRoot: '/root',
      llmClient: mockLLMClient,
      agentRegistry: mockAgentRegistry,
      memoryManager: mockMemoryManager,
      contextRetrieverFactory: {} as any,
      debugMode: false
    });
  });

  it('should initialize correctly', async () => {
    await orchestrator.initialize();
    
    expect(mockMemoryManager.updateCoreMemory).toHaveBeenCalled();
    expect(RetrieverFactory.create).toHaveBeenCalledWith('/root');
  });

  it('should have initial state as init', () => {
    expect(orchestrator.getCurrentPhase()).toBe('init');
  });
});
