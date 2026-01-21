# 实施指南：01-Architecture

> 本文档描述 `ccq-engine` 的核心架构实现，包括核心模块的脚手架搭建、依赖注入机制以及数据流转的基础设施。

## 1. 核心模块定义

根据设计文档，`@ccq/engine` 包含以下核心模块。我们将定义它们的接口。

### 1.1 模块接口定义 (`src/types.ts`)

```typescript
// 通用配置接口
export interface Config {
  rootPath: string;
  dbPath: string;
  ignorePatterns: string[];
  // ... 其他配置
}

// 扫描器接口
export interface IScanner {
  scan(root: string): Promise<string[]>;
}

// 索引器接口
export interface IIndexer {
  indexFiles(files: string[]): Promise<void>;
}

// 检索器接口
export interface IRetriever {
  query(q: string, options: RetrievalOptions): Promise<RetrievalResult>;
}

// 存储接口
export interface IStorage {
  saveChunks(chunks: Chunk[]): Promise<void>;
  saveVectors(vectors: Vector[]): Promise<void>;
  // ...
}
```

## 2. 依赖注入 (DI) 容器

为了解耦各模块，建议使用简单的工厂模式或轻量级 DI 容器（如 `tsyringe` 或手写简单的 Registry）。

### 简单 Registry 实现 (`src/core/container.ts`)

```typescript
class Container {
  private services = new Map<string, any>();

  register<T>(name: string, service: T) {
    this.services.set(name, service);
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not found`);
    return service;
  }
}

export const container = new Container();
```

## 3. 核心类脚手架

创建各模块的基础类结构。

### 3.1 Scanner (`src/indexer/scanner.ts`)
```typescript
import { IScanner } from '../types';
import { glob } from 'glob';

export class FileScanner implements IScanner {
  async scan(root: string): Promise<string[]> {
    // TODO: Implement glob scan with ignore patterns
    return [];
  }
}
```

### 3.2 Context Engine Facade (`src/engine.ts`)
作为对外的统一入口。

```typescript
import { container } from './core/container';

export class ContextEngine {
  constructor(private config: Config) {
    this.init();
  }

  private init() {
    // 初始化并注册各模块
    // container.register('storage', new SQLiteStorage(this.config.dbPath));
    // container.register('scanner', new FileScanner());
    // ...
  }

  async index() {
    // 编排索引流程
    // 1. scan
    // 2. chunk
    // 3. embed
    // 4. store
  }

  async retrieve(query: string) {
    // 编排检索流程
  }
}
```

## 4. 技术选型集成

### 4.1 Tokenizer
引入 `tiktoken` 或 `gpt-tokenizer`。

```bash
npm install tiktoken
```

```typescript
// src/utils/tokenizer.ts
import { get_encoding } from "tiktoken";

const enc = get_encoding("cl100k_base");

export function countTokens(text: string): number {
  return enc.encode(text).length;
}
```

### 4.2 Tree-sitter (Lazy Loading)
设计 Parser 加载器。

```typescript
// src/indexer/parser-loader.ts
export class ParserLoader {
  private parsers = new Map<string, any>();

  async getParser(lang: string) {
    if (this.parsers.has(lang)) return this.parsers.get(lang);
    
    // 动态 import WASM
    // await Parser.init();
    // const Lang = await import(`tree-sitter-${lang}`);
    // const parser = new Parser();
    // parser.setLanguage(Lang);
    
    // this.parsers.set(lang, parser);
    // return parser;
  }
}
```

## 5. 数据流管道实现

使用 Pipeline 模式处理数据流（如索引过程）。

```typescript
// src/core/pipeline.ts
export abstract class Step<I, O> {
  abstract process(input: I): Promise<O>;
}

export class IndexingPipeline {
  async execute(files: string[]) {
    // Step 1: Read Content
    // Step 2: Chunking
    // Step 3: Embedding
    // Step 4: Storage
  }
}
```

## 6. 验证计划

1.  **单元测试**: 验证 Container 的注册与解析。
2.  **集成测试**: 实例化 `ContextEngine`，模拟各组件的空实现，确保调用链路通畅。

---
**下一步**：参考 `02-indexing-impl.md` 实现 Scanner 和 Chunker 的具体逻辑。
