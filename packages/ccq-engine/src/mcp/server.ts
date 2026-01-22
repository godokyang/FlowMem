// @ts-ignore
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// @ts-ignore
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
// @ts-ignore
} from '@modelcontextprotocol/sdk/types.js';

export class MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'ccq-engine', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'codebase_retrieval',
            description: 'Semantic search over the codebase',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                topK: { type: 'number' }
              },
              required: ['query']
            }
          },
          {
            name: 'codebase_ask',
            description: 'Ask a question about the codebase',
            inputSchema: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                topK: { type: 'number' }
              },
              required: ['question']
            }
          },
          {
            name: 'codebase_status',
            description: 'Get indexing status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'codebase_retrieval') {
        const { ContextEngine } = await import('../engine.js');
        const { ConfigLoader } = await import('../core/config-loader.js');
        const config = ConfigLoader.load(process.cwd());
        const engine = new ContextEngine(config);
        const result = await engine.retrieve(args.query, { topK: args.topK });
        return { content: [{ type: 'text', text: result }] };
      }
      
      if (name === 'codebase_ask') {
        const { ContextEngine } = await import('../engine.js');
        const { ConfigLoader } = await import('../core/config-loader.js');
        const config = ConfigLoader.load(process.cwd());
        const engine = new ContextEngine(config);
        const result = await engine.ask(args.question, { topK: args.topK });
        return { content: [{ type: 'text', text: result }] };
      }
      
      if (name === 'codebase_status') {
        const { ContextEngine } = await import('../engine.js');
        const { ConfigLoader } = await import('../core/config-loader.js');
        const config = ConfigLoader.load(process.cwd());
        const engine = new ContextEngine(config);
        const result = await engine.getStatus();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      
      throw new Error(`Tool ${name} not found`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
