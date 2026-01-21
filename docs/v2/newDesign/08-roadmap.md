# 实施路线图 (Implementation Roadmap)

目标：一次性交付完整功能，不分阶段发布。

## 1. 核心引擎 (Core Engine)

### 基础架构
- [ ] Lerna Monorepo 架构 (@ccq/workflow + @ccq/engine)
- [ ] 插件化架构 (Parser, Embeddings, Storage)
- [ ] 配置系统 (.ccq/config.yaml)

### 索引系统 (Indexing)
- [ ] **多语言支持**：集成 Tree-sitter 支持 25+ 编程语言
- [ ] **Ignore 策略**：支持 .gitignore + .augmentignore
- [ ] **Chunk 切分**：通用 AST 切分 + 字符 Fallback
- [ ] **增量更新**：
  - [ ] 文件级 Hash 校验
  - [ ] Chunk 级智能复用 (AST Diff)
  - [ ] 删除文件自动清理

### 检索系统 (Retrieval)
- [ ] **Embeddings**：
  - [ ] 离线：Transformers.js (all-MiniLM-L6-v2)
  - [ ] 在线：可配置 HTTP Provider
- [ ] **混合召回**：BM25 (关键词) + Vector (语义)
- [ ] **RRF 融合**：Rank Fusion 算法 (k=60)
- [ ] **Context Packer**：LLM 友好的上下文格式化
- [ ] **高级检索**：
  - [ ] Contextual Retrieval (为 chunk 生成定位上下文)
  - [ ] Rerank (重排序)
  - [ ] 符号索引 (定义/引用跳转)

## 2. 结构化理解 (Structured Understanding)

- [ ] **依赖图谱**：轻量级依赖分析 (imports/calls)
- [ ] **跨文件关联**：自动关联 import 模块
- [ ] **Query Expansion**：基于依赖图扩展查询范围
- [ ] **Direct Context**：支持索引远程仓库和 API 文档

## 3. 接口与集成 (Interfaces)

### CLI 工具
- [ ] `ccq index`：全量/增量索引
- [ ] `ccq context`：检索上下文
- [ ] `ccq ask`：一站式问答 (searchAndAsk)
- [ ] `ccq status`：查看索引状态
- [ ] `ccq export/import`：状态持久化与迁移

### MCP Server
- [ ] `codebase_retrieval` 工具
- [ ] `codebase_ask` 工具
- [ ] `codebase_status` 工具

### 开发体验
- [ ] **Watch 模式**：文件监听与自动索引
- [ ] **Git Integration**：Git Hooks (post-checkout/post-commit)
- [ ] **IDE 集成**：VS Code / Cursor 插件支持

## 4. 性能与优化

- [ ] **智能缓存**：问答缓存与预热索引
- [ ] **存储优化**：向量量化与压缩
- [ ] **并发控制**：文件锁与事务管理
