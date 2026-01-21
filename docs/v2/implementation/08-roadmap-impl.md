# 实施指南：08-Roadmap (Execution Plan)

> 本文档将 Roadmap 转化为具体的开发任务清单 (Checklist)，用于追踪进度。

## Phase 1: 核心引擎与基础架构

### 1.1 初始化
- [ ] 创建 Monorepo 结构 (`lerna init`)
- [ ] 初始化 `@ccq/engine` 包结构
- [ ] 初始化 `@ccq/workflow` 包结构
- [ ] 配置 TypeScript, ESLint, Prettier
- [ ] 安装核心依赖 (`commander`, `better-sqlite3`, `web-tree-sitter`, `tiktoken`)

### 1.2 索引系统基础
- [ ] 实现 `IgnoreManager` (加载 .gitignore)
- [ ] 实现 `FileScanner` (集成 glob)
- [ ] 实现 `DBManager` & Schema (files, chunks 表)
- [ ] 实现 `FileDAO` (CRUD)

### 1.3 简单的 Chunker
- [ ] 实现 `LineChunker` (Fallback 策略)
- [ ] 实现 `ParserFactory` (Tree-sitter WASM 加载)
- [ ] 实现 `ASTChunker` (TypeScript 支持)
- [ ] 验证 chunking 逻辑

### 1.4 Embeddings & Storage
- [ ] 实现 `OfflineProvider` (Transformers.js)
- [ ] 实现 `VectorDAO` (存储 float32)
- [ ] 串联 Index 流程：Scan -> Chunk -> Embed -> Store

## Phase 2: 检索与 API

### 2.1 检索逻辑
- [ ] 实现 `BM25Index` (内存版)
- [ ] 实现 `RRF` 算法
- [ ] 实现 `ContextPacker` (Token 计数)
- [ ] 封装 `Retriever` 类

### 2.2 CLI & MCP
- [ ] 实现 `ccq index` 命令
- [ ] 实现 `ccq context` 命令
- [ ] 实现 `MCPServer` 基础框架
- [ ] 暴露 `codebase_retrieval` 工具

## Phase 3: 高级特性与优化

### 3.1 增量更新
- [ ] 实现 `IncrementalIndexer` (Hash 对比)
- [ ] 优化 `ASTChunker` (支持 diff 复用 - 可选高难度)
- [ ] 实现删除逻辑

### 3.2 混合模式
- [ ] 实现 `ConfigLoader`
- [ ] 在 `Retriever` 中集成 `project.md` 读取

### 3.3 状态持久化
- [ ] 实现 `ccq export/import` (gzip 压缩 DB)

### 3.4 多语言扩展
- [ ] 添加 Python, Go, Rust 的 Tree-sitter WASM
- [ ] 配置各语言 AST 边界规则

## Phase 4: 集成与发布

### 4.1 集成
- [ ] 在 `@ccq/workflow` 中调用 Engine
- [ ] 编写 `ccq init` 生成配置文件

### 4.2 文档与测试
- [ ] 编写 README 使用说明
- [ ] 运行 Benchmark 测试
- [ ] 发布 npm 包

---
**下一步**：参考 `09-config-impl.md` 确定配置解析逻辑。
