# 实施路线图 (Implementation Roadmap)

目标：一次性交付完整功能，不分阶段发布。

## 当前状态：V1.0.0 (2026-01-22)

### ✅ 已完成功能

## 1. 核心引擎 (Core Engine)

### 基础架构
- [x] Lerna Monorepo 架构 (@ccq/workflow + @ccq/engine)
- [x] 插件化架构 (Parser, Embeddings, Storage)
- [x] 配置系统 (.ccq/config.yaml)

### 索引系统 (Indexing)
- [x] **多语言支持**：集成 Tree-sitter 支持 25+ 编程语言
- [x] **Ignore 策略**：支持 .gitignore + .augmentignore
- [x] **Chunk 切分**：通用 AST 切分 + 字符 Fallback
- [x] **增量更新**：
  - [x] 文件级 Hash 校验
  - [ ] ~~Chunk 级智能复用 (AST Diff)~~ → V1.5
  - [x] 删除文件自动清理

### 检索系统 (Retrieval)
- [x] **Embeddings**：
  - [x] 离线：Transformers.js (all-MiniLM-L6-v2)
  - [x] 在线：可配置 HTTP Provider (OpenAI)
- [x] **混合召回**：BM25 (关键词) + Vector (语义)
- [x] **RRF 融合**：Rank Fusion 算法 (k=60)
- [x] **Context Packer**：LLM 友好的上下文格式化
- [x] **高级检索**：
  - [x] Contextual Retrieval (为 chunk 生成定位上下文)
  - [x] Rerank (重排序)
  - [x] 符号索引 (定义/引用跳转)

## 2. 结构化理解 (Structured Understanding)

- [ ] ~~**依赖图谱**：轻量级依赖分析 (imports/calls)~~ → V2
- [ ] ~~**跨文件关联**：自动关联 import 模块~~ → V2
- [ ] ~~**Query Expansion**：基于依赖图扩展查询范围~~ → V2
- [x] **Direct Context**：支持索引远程文件 (`ccq add-remote`)

## 3. 接口与集成 (Interfaces)

### CLI 工具
- [x] `ccq init`：初始化配置
- [x] `ccq index`：全量/增量索引
- [x] `ccq context`：检索上下文
- [x] `ccq ask`：一站式问答 (searchAndAsk)
- [x] `ccq status`：查看索引状态
- [x] `ccq export/import`：状态持久化与迁移
- [x] `ccq add-remote`：索引远程文件
- [x] `ccq install-hooks`：安装 Git Hooks

### MCP Server
- [x] `codebase_retrieval` 工具
- [x] `codebase_ask` 工具
- [x] `codebase_status` 工具

### 开发体验
- [x] **Watch 模式**：文件监听与自动索引
- [x] **Git Integration**：Git Hooks (post-checkout/post-commit)
- [ ] ~~**IDE 集成**：VS Code / Cursor 插件支持~~ → 未来

## 4. 性能与优化

- [ ] ~~**智能缓存**：问答缓存与预热索引~~ → V1.5
- [ ] ~~**存储优化**：向量量化与压缩~~ → V1.5
- [x] **并发控制**：文件锁与事务管理

## 5. @ccq/workflow 包

### FlowMem 工作流引擎
- [x] `flowmem init`：初始化 FlowMem 到项目
- [x] `flowmem audit`：运行审核检查
- [x] `flowmem status`：查看工作流状态
- [x] `flowmem todo`：管理任务列表
- [x] `flowmem upgrade`：升级到最新版本
- [x] 7 个编辑器适配器支持
- [x] `--with-mcp` 选项（生成 MCP 配置）

---

## V1.5 规划（未实现）

### 性能优化
- [ ] **Chunk 级智能复用**：AST Diff 避免重复 embedding
- [ ] **智能缓存**：LRU 缓存问答结果
- [ ] **向量压缩**：量化存储减少磁盘占用

### 用户体验
- [ ] **进度条**：索引进度实时显示
- [ ] **错误恢复**：索引失败自动重试
- [ ] **配置向导**：交互式配置生成

---

## V2 规划（未实现）

### 结构化理解
- [ ] **依赖图谱**：解析 import/require 构建依赖关系
- [ ] **跨文件关联**：函数调用链追踪
- [ ] **Query Expansion**：基于依赖图自动扩展查询

### 多仓库支持
- [ ] **Workspace 模式**：支持 monorepo 多包索引
- [ ] **远程仓库**：索引 GitHub/GitLab 仓库
- [ ] **增量同步**：自动拉取远程变更

### AI 增强
- [ ] **智能摘要**：自动生成模块/函数摘要
- [ ] **代码解释**：自然语言解释代码逻辑
- [ ] **相似代码检测**：查找重复/相似代码块

---

## 发布策略

- **V1.0.0** (当前): 核心功能完整，可生产使用
- **V1.5.0** (未来): 性能优化与体验改进
- **V2.0.0** (未来): 结构化理解与多仓库支持

## 版本兼容性

- **V1.0 → V1.5**: 完全向后兼容，配置文件无变更
- **V1.5 → V2.0**: 配置文件需升级（自动迁移工具）
