# ccq-engine 设计文档 (v2)

> 模块化重构版设计文档

## 目录结构

| 文件 | 描述 | 对应原章节 |
|------|------|------------|
| [00-overview.md](./00-overview.md) | **概述**：背景、目标、范围、Monorepo 架构 | §1, §2 |
| [01-architecture.md](./01-architecture.md) | **高层架构**：组件图、数据流、核心模块 | §3 |
| [02-indexing.md](./02-indexing.md) | **索引设计**：Ignore 策略、Chunk 策略、AST 规则 | §4.1, §4.2 |
| [03-retrieval.md](./03-retrieval.md) | **检索设计**：Embeddings, BM25, RRF, Context Packer | §4.3-4.6 |
| [04-storage.md](./04-storage.md) | **存储设计**：SQLite 表结构、增量更新、体积评估 | §5, §11.3 |
| [05-api.md](./05-api.md) | **API 设计**：CLI 命令、MCP 工具、状态持久化 | §6 |
| [06-integration.md](./06-integration.md) | **集成指南**：FlowMem 工作流、Claude/Copilot 集成 | §7-9 |
| [07-operations.md](./07-operations.md) | **运维与质量**：安全、性能、测试、最佳实践 | §10-12, §14 |
| [08-roadmap.md](./08-roadmap.md) | **路线图**：版本计划 (V1, V1.5, V2) | §13 |
| [09-appendix.md](./09-appendix.md) | **附录**：配置文件模板、FAQ | Appendix A-B |

## 核心变更点 (v2)

1. **普适性扩展**：语言支持从 TS/JS 扩展到 25+ 编程语言 (Tree-sitter)
2. **混合模式**：支持 `project.md` + 自动检索的混合工作流
3. **架构升级**：采用 Lerna Monorepo (`ccq-workflow` + `ccq-engine`)
4. **高级检索**：新增 `searchAndAsk` (RAG) 和状态持久化 (export/import)
5. **对齐竞品**：复刻 Augment Context Services 核心能力 (FileSystem Context, Direct Context)
