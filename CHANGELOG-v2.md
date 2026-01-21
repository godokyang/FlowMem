# Changelog - CCQ Engine v2.0.0

## [2.0.0] - 2026-01-21

### Added
- ✨ Monorepo 架构（Lerna + npm workspaces）
- ✨ @ccq/engine 包
  - AST 感知的代码切分
  - 混合检索（BM25 + Vector + RRF）
  - SQLite 持久化存储
  - 支持多种编程语言
  - MCP Server 集成
- ✨ @ccq/workflow 包
  - FlowMem CLI 工具
  - AI 上下文记忆管理
  - 编辑器适配器集成

### Changed
- 🔄 项目结构重构为 Monorepo
- 🔄 代码架构升级为 TypeScript

### Fixed
- 🐛 修复依赖管理问题
- 🐛 改进类型定义

### Technical Details
- **Core Dependencies**: better-sqlite3, web-tree-sitter, tiktoken
- **Embeddings**: @xenova/transformers (offline), OpenAI API (online)
- **Retrieval**: BM25 + Cosine Similarity + RRF fusion
- **Storage**: SQLite with WAL mode
- **MCP**: stdio transport support

### Statistics
- Total Tasks: 71
- Completed: 71 (100%)
- Files Created: 50+
- Lines of Code: ~3000+
