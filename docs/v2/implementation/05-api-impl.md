# 实施指南：05-API

> 本文档描述 CLI 命令的参数解析与执行逻辑，以及 MCP Server 的实现。

## 1. CLI 实现

使用 `commander` 库。

### 1.1 命令定义 (`src/cli/index.ts`)

```typescript
import { Command } from 'commander';
import { ContextEngine } from '../engine';

const program = new Command();

program
  .name('ccq')
  .description('Codebase Context Query Engine');

program.command('index')
  .description('Index the codebase')
  .option('--full', 'Force full re-indexing')
  .option('--watch', 'Watch mode')
  .action(async (options) => {
    const engine = new ContextEngine(getConfig());
    await engine.index(options);
  });

program.command('context')
  .argument('<query>', 'Search query')
  .option('--topK <n>', 'Number of chunks', parseInt)
  .action(async (query, options) => {
    const engine = new ContextEngine(getConfig());
    const result = await engine.retrieve(query, options);
    console.log(result);
  });

program.command('ask')
  .argument('<question>', 'Question about the codebase')
  .option('--model <name>', 'LLM model to use', 'gpt-4o-mini')
  .option('--topK <n>', 'Number of context chunks', parseInt, 10)
  .action(async (question, options) => {
    const engine = new ContextEngine(getConfig());
    const answer = await engine.ask(question, options);
    console.log(answer);
  });

program.command('status')
  .description('Show indexing status and statistics')
  .action(async () => {
    const engine = new ContextEngine(getConfig());
    const stats = await engine.getStatus();
    console.log(formatStatus(stats));
  });

program.parse();
```

### 1.2 交互式配置 (ccq init)
如果配置文件不存在，引导用户创建。

## 2. MCP Server 实现

**依赖**: `@modelcontextprotocol/sdk`

### 2.1 Server 结构 (`src/mcp/server.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPServer {
  private server: Server;
  private engine: ContextEngine;

  constructor() {
    this.engine = new ContextEngine(getConfig());
    this.server = new Server(
      { name: "ccq-engine", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // List Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "codebase_retrieval",
            description: "Semantic search over the codebase",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                topK: { type: "number" }
              },
              required: ["query"]
            }
          },
          // ... codebase_ask, codebase_status ...
        ]
      };
    });

    // Call Tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === "codebase_retrieval") {
        const result = await this.engine.retrieve(args.query as string, {
          topK: args.topK as number
        });
        return {
          content: [{ type: "text", text: result }]
        };
      }
      
      throw new Error(`Tool ${name} not found`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

### 2.2 错误处理
确保所有异常都被捕获并返回为 MCP Error 格式，防止 Server 崩溃退出。

## 3. 状态持久化命令 (Export/Import)

实现数据库文件的备份与恢复。

```typescript
// src/cli/commands/export.ts
import fs from 'fs/promises';
import { gzip } from 'zlib'; // 压缩

export async function exportState(dest: string) {
  // 1. 关闭 DB 连接
  // 2. 读取 SQLite 文件
  // 3. (可选) Gzip 压缩
  // 4. 写入 dest
}
```

## 3. ccq ask 命令实现

### 3.1 LLM Client 实现

**依赖**: 支持多种 LLM 提供商

```typescript
// src/llm/client.ts
export interface LLMClient {
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

**OpenAI 实现**:
```typescript
// src/llm/openai-client.ts
export class OpenAIClient implements LLMClient {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1'
  ) {}

  async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

### 3.2 Ask Engine 实现

```typescript
// src/engine.ts (扩展)
export class ContextEngine {
  private llmClient: LLMClient;

  async ask(question: string, options: AskOptions = {}): Promise<string> {
    // 1. 检索相关上下文
    const context = await this.retrieve(question, {
      topK: options.topK || 10
    });

    // 2. 构建 Prompt
    const systemPrompt = `You are a helpful coding assistant. Answer the user's question based on the following codebase context:

${context}

If the context doesn't contain enough information, say so clearly.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ];

    // 3. 调用 LLM
    return await this.llmClient.chat(messages, {
      model: options.model,
      temperature: 0.7
    });
  }
}
```

### 3.3 CLI 输出格式化

```typescript
// src/cli/formatters.ts
import chalk from 'chalk';

export function formatAnswer(answer: string, metadata?: any) {
  console.log(chalk.bold.green('\n🤖 Answer:\n'));
  console.log(answer);
  
  if (metadata) {
    console.log(chalk.dim('\n---'));
    console.log(chalk.dim(`Context chunks used: ${metadata.chunksUsed}`));
    console.log(chalk.dim(`Tokens: ${metadata.tokens}`));
    console.log(chalk.dim(`Estimated cost: $${metadata.cost.toFixed(4)}`));
  }
}
```

## 4. ccq status 命令实现

### 4.1 Status 数据收集

```typescript
// src/engine.ts (扩展)
export interface IndexStatus {
  // 基础统计
  totalFiles: number;
  totalChunks: number;
  totalVectors: number;
  
  // 存储信息
  dbSize: string;        // "12.5 MB"
  dbPath: string;
  
  // 索引信息
  lastIndexed: string;   // ISO 8601
  isIndexing: boolean;
  
  // 语言分布
  languageStats: { lang: string; files: number; chunks: number }[];
  
  // 性能信息
  avgChunkSize: number;  // tokens
  indexBuildTime?: number; // ms
}

export class ContextEngine {
  async getStatus(): Promise<IndexStatus> {
    const fileDAO = container.resolve<FileDAO>('fileDAO');
    const chunkDAO = container.resolve<ChunkDAO>('chunkDAO');
    const vectorDAO = container.resolve<VectorDAO>('vectorDAO');

    // 获取基础统计
    const totalFiles = await fileDAO.count();
    const totalChunks = await chunkDAO.count();
    const totalVectors = await vectorDAO.count();

    // 获取数据库大小
    const dbPath = this.config.dbPath;
    const dbStats = await fs.stat(dbPath);
    const dbSize = this.formatBytes(dbStats.size);

    // 获取最后索引时间
    const lastIndexed = await this.getLastIndexTime();

    // 语言统计
    const languageStats = await chunkDAO.getLanguageStats();

    // 平均 chunk 大小
    const avgChunkSize = await chunkDAO.getAvgTokens();

    return {
      totalFiles,
      totalChunks,
      totalVectors,
      dbSize,
      dbPath,
      lastIndexed,
      isIndexing: false, // 从状态文件读取
      languageStats,
      avgChunkSize
    };
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
```

### 4.2 Status 格式化输出

```typescript
// src/cli/formatters.ts
export function formatStatus(status: IndexStatus) {
  console.log(chalk.bold.cyan('\n📊 CCQ Engine Status\n'));
  
  console.log(chalk.bold('Index Statistics:'));
  console.log(`  Files:   ${chalk.green(status.totalFiles.toLocaleString())}`);
  console.log(`  Chunks:  ${chalk.green(status.totalChunks.toLocaleString())}`);
  console.log(`  Vectors: ${chalk.green(status.totalVectors.toLocaleString())}`);
  
  console.log(chalk.bold('\nStorage:'));
  console.log(`  Database: ${status.dbSize}`);
  console.log(`  Path:     ${chalk.dim(status.dbPath)}`);
  
  console.log(chalk.bold('\nLast Indexed:'));
  console.log(`  ${formatRelativeTime(status.lastIndexed)}`);
  
  if (status.languageStats.length > 0) {
    console.log(chalk.bold('\nLanguage Distribution:'));
    for (const { lang, files, chunks } of status.languageStats.slice(0, 5)) {
      console.log(`  ${lang.padEnd(12)} ${files} files, ${chunks} chunks`);
    }
  }
  
  console.log(chalk.bold('\nPerformance:'));
  console.log(`  Avg chunk size: ${status.avgChunkSize} tokens`);
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day(s) ago`;
  if (hours > 0) return `${hours} hour(s) ago`;
  if (minutes > 0) return `${minutes} minute(s) ago`;
  return 'Just now';
}
```

## 5. Watch 模式实现

### 5.1 文件监听

**依赖**: `chokidar`

```typescript
// src/watcher/file-watcher.ts
import chokidar from 'chokidar';
import { IgnoreManager } from '../indexer/ignore-manager';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;

  constructor(
    private root: string,
    private ignoreManager: IgnoreManager,
    private onChangeCallback: (changes: FileChange[]) => Promise<void>
  ) {}

  async start() {
    console.log('👀 Watching for file changes...');

    this.watcher = chokidar.watch(this.root, {
      ignored: (path) => this.ignoreManager.ignores(path),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    const changeQueue: FileChange[] = [];
    let debounceTimer: NodeJS.Timeout | null = null;

    const flushQueue = async () => {
      if (changeQueue.length > 0) {
        await this.onChangeCallback([...changeQueue]);
        changeQueue.length = 0;
      }
    };

    const scheduleFlush = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flushQueue, 1000); // 1秒防抖
    };

    this.watcher
      .on('add', (path) => {
        changeQueue.push({ type: 'added', path });
        scheduleFlush();
      })
      .on('change', (path) => {
        changeQueue.push({ type: 'modified', path });
        scheduleFlush();
      })
      .on('unlink', (path) => {
        changeQueue.push({ type: 'deleted', path });
        scheduleFlush();
      });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export interface FileChange {
  type: 'added' | 'modified' | 'deleted';
  path: string;
}
```

### 5.2 Watch 命令集成

```typescript
// src/cli/index.ts
program.command('index')
  .option('--watch', 'Watch mode (auto re-index on file changes)')
  .action(async (options) => {
    const engine = new ContextEngine(getConfig());
    
    if (options.watch) {
      // 首次索引
      await engine.index({ full: false });
      
      // 启动监听
      const watcher = new FileWatcher(
        getConfig().rootPath,
        engine.getIgnoreManager(),
        async (changes) => {
          console.log(`\n🔄 Detected ${changes.length} change(s), re-indexing...`);
          await engine.incrementalUpdate(changes);
          console.log('✅ Index updated');
        }
      );
      
      await watcher.start();
      
      // 优雅退出
      process.on('SIGINT', () => {
        console.log('\n👋 Stopping watcher...');
        watcher.stop();
        process.exit(0);
      });
    } else {
      await engine.index(options);
    }
  });
```

## 6. 验证计划

1.  **CLI 测试**: 
    - 运行 `ccq index`，检查是否生成 `.ccq/index.db`。
    - 运行 `ccq context "test"`，检查是否有输出。
2.  **MCP 测试**: 
    - 使用 MCP Inspector (Anthropic 提供的工具) 连接本地 stdio server。
    - 手动调用 `codebase_retrieval` 工具验证响应。

---
**下一步**：参考 `06-integration-impl.md` 实现与外部系统的集成。
