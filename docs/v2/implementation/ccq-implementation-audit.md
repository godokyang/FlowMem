# CCQ Engine 实现审计与修复计划

> **生成时间**: 2026-01-22  
> **状态**: 待执行  
> **说明**: 基于代码库审计发现的未实现功能清单（原 Todolist 显示 100% 完成，但实际核心逻辑多为 Mock 或空实现）。

## 🔴 High Priority (核心功能不可用)

### [IMPL-001] 实现 ContextEngine.index() 完整流程
- **当前状态**: 仅有 `console.log`
- **目标**: 串联索引全流程
- **步骤**:
  1. 调用 `FileScanner.scan()` 获取文件列表
  2. 调用 `IgnoreManager` 过滤文件
  3. 遍历文件，计算 Hash，判断增量（需集成 `IMPL-006`）
  4. 调用 `ASTChunker`/`LineChunker` 切分
  5. 调用 `EmbeddingsProvider` 生成向量
  6. 开启 DB 事务，调用 `FileDAO`/`ChunkDAO`/`VectorDAO` 存储
  7. 更新 `index_meta` 状态
  8. 触发 `BM25Index` 重建或增量更新

### [IMPL-002] 实现 ContextEngine.retrieve() 完整流程
- **当前状态**: 返回空字符串
- **目标**: 实现混合检索
- **步骤**:
  1. 对 Query 进行 Embedding
  2. 并行调用:
     - `BM25Index.search(query)` -> List A
     - `VectorSearcher.search(vector)` -> List B
  3. 调用 `rrf(List A, List B)` 进行融合排序
  4. 从 `ChunkDAO` 获取 Chunk 详情
  5. 调用 `ContextPacker.pack()` 格式化输出

### [IMPL-003] 实现 ContextEngine.ask() 及 LLM 集成
- **当前状态**: 方法不存在
- **目标**: 实现 RAG 问答
- **步骤**:
  1. 实现 `LLMClient` (OpenAI/Anthropic 适配)
  2. 在 `ContextEngine` 中添加 `ask(question)` 方法
  3. 逻辑: `retrieve(question)` -> 构建 Prompt -> `llm.complete()`

### [IMPL-004] 实现 ContextEngine.getStatus()
- **当前状态**: 方法不存在
- **目标**: 提供索引统计
- **步骤**:
  1. 查询 `index_meta` 表获取状态/时间
  2. 统计 `files`, `chunks`, `vectors` 表行数
  3. 返回 `IndexStats` 对象

### [IMPL-005] 增强 BM25 Tokenizer
- **当前状态**: 简单正则 `/[a-z0-9]+/g`
- **目标**: 代码感知分词
- **需求**:
  - CamelCase: `getUserById` -> `get`, `User`, `By`, `Id`, `getUserById`
  - SnakeCase: `get_user_by_id` -> `get`, `user`, `by`, `id`, `get_user_by_id`

---

## 🟡 Medium Priority (功能增强)

### [IMPL-006] 实现增量索引 (Incremental Indexing)
- **当前状态**: Hash 工具存在但未集成
- **目标**: 避免重复索引未变更文件
- **逻辑**:
  - `currentHash = sha256(fileContent)`
  - `dbHash = fileDAO.get(path).hash`
  - If equal -> skip
  - If not equal -> delete old chunks/vectors -> re-index

### [IMPL-007] 实现 Watch 模式
- **当前状态**: CLI 参数存在，逻辑未实现
- **目标**: 文件变更自动索引
- **方案**: 集成 `chokidar`，监听 add/change/unlink 事件，防抖触发 `index(file)`

### [IMPL-008] 实现文件删除处理
- **当前状态**: 未处理
- **目标**: 清理已删除文件的索引
- **逻辑**: 全量扫描后，对比 DB 中的 paths 和磁盘 paths，删除 DB 中多余的记录。

### [IMPL-009] 完善 IgnoreManager
- **当前状态**: 只读 `.gitignore`
- **目标**: 支持 `.augmentignore`
- **步骤**: 修改 `loadRules`，按顺序加载 `.gitignore` 和 `.augmentignore`

### [IMPL-010] 增强 ASTChunker 语言支持
- **当前状态**: 仅支持 TS/JS/Py/Go/Rust
- **目标**: 扩展更多语言 & 优化大文件切分
- **步骤**:
  1. 补充 C/C++, Java, Ruby, PHP 等语言的 Boundary 定义
  2. 实现 `maxChunkSize` 逻辑：当 AST 节点过大时，强制进行二次递归或字符切分

---

## 🟢 Low Priority (高级功能)

- **[IMPL-011] 状态导出/导入**: 实现 SQLite db 文件的备份与恢复
- **[IMPL-012] Direct Context**: 支持 fetch URL 内容并索引
- **[IMPL-013] Git Hooks**: 编写 post-checkout 脚本自动触发索引
