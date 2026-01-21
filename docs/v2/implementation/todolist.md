# 任务清单: CCQ Engine 完整实施计划

> **项目**: FlowMem v2 - 代码库上下文查询引擎  
> **版本**: v2.0.0  
> **关联设计**: [newDesign.md](../newDesign/*)

## 📊 进度统计
```
总任务: 71
已完成: 0 (0%)
进行中: 0 (0%)
待开始: 71 (100%)
已取消: 0 (0%)

[░░░░░░░░░░░░░░░░░░░░] 0%
```

**预计总时间**: 100h 15m  
**平均任务时长**: 1h 25m

---

## 📋 任务列表

### Phase 1: 基础架构（8 个任务，预计 4h 15m）

- [ ] **TODO-001**: 创建 Monorepo 结构（Lerna + npm workspaces）
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: 无
  - 参考: [00-overview-impl.md](00-overview-impl.md#1-初始化-monorepo)

- [ ] **TODO-002**: 配置 TypeScript 环境（根 tsconfig + 包继承）
  - 优先级: 🔴 High
  - 预计: 20m
  - 依赖: TODO-001
  - 参考: [00-overview-impl.md](00-overview-impl.md#typescript-配置)

- [ ] **TODO-003**: 配置 ESLint + Prettier
  - 优先级: 🟡 Medium
  - 预计: 15m
  - 依赖: TODO-002
  - 参考: [00-overview-impl.md](00-overview-impl.md#eslint--prettier)

- [ ] **TODO-004**: 初始化 @ccq/engine 包结构
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-002
  - 参考: [00-overview-impl.md](00-overview-impl.md#初始化-ccqengine)

- [ ] **TODO-005**: 初始化 @ccq/workflow 包结构
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-002
  - 参考: [00-overview-impl.md](00-overview-impl.md#初始化-ccqworkflow)

- [ ] **TODO-006**: 安装核心依赖（better-sqlite3, commander, web-tree-sitter 等）
  - 优先级: 🔴 High
  - 预计: 15m
  - 依赖: TODO-004, TODO-005
  - 参考: [00-overview-impl.md](00-overview-impl.md#核心依赖)

- [ ] **TODO-007**: 实现依赖注入容器（Container）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-004
  - 参考: [01-architecture-impl.md](01-architecture-impl.md#2-依赖注入-di-容器)

- [ ] **TODO-008**: 定义核心接口（IScanner, IIndexer, IRetriever, IStorage）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-007
  - 参考: [01-architecture-impl.md](01-architecture-impl.md#11-模块接口定义)

---

### Phase 2: 索引系统（9 个任务，预计 11h 30m）

- [ ] **TODO-009**: 实现 IgnoreManager（.gitignore + .augmentignore 解析）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-008
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#11-规则加载)

- [ ] **TODO-010**: 实现 FileScanner（集成 glob + ignore）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-009
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#2-scanner-实现)

- [ ] **TODO-011**: 实现 ParserFactory（Tree-sitter WASM 加载 + 多路径查找）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-008
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#32-tree-sitter-集成)

- [ ] **TODO-012**: 编写 WASM 下载脚本（scripts/download-grammars.js）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-011
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#wasm-资源管理策略)

- [ ] **TODO-013**: 实现 LineChunker（Fallback 策略）
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-008
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#34-fallback-chunker)

- [ ] **TODO-014**: 实现 ASTChunker（TypeScript 支持）
  - 优先级: 🔴 High
  - 预计: 3h
  - 依赖: TODO-011, TODO-013
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#32-tree-sitter-集成)

- [ ] **TODO-015**: 配置多语言 AST 边界规则（Python, Go, Rust 等）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-014
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#语言特定边界配置)

- [ ] **TODO-016**: 实现 MarkdownChunker（按 Heading 切分）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-008
  - 参考: [02-indexing-impl.md](02-indexing-impl.md#33-markdown-chunker)

- [ ] **TODO-017**: 实现 Tokenizer 工具（tiktoken 集成）
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-008
  - 参考: [01-architecture-impl.md](01-architecture-impl.md#41-tokenizer)

---

### Phase 3: 存储层（8 个任务，预计 10h）

- [ ] **TODO-018**: 定义 SQLite Schema（files, chunks, vectors, bm25_postings）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-008
  - 参考: [04-storage-impl.md](04-storage-impl.md#11-schema-定义)

- [ ] **TODO-019**: 实现 DBManager（初始化 + 事务支持 + WAL 模式）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-018
  - 参考: [04-storage-impl.md](04-storage-impl.md#12-db-管理类)

- [ ] **TODO-020**: 实现 FileDAO（CRUD + getAllPaths）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-019
  - 参考: [04-storage-impl.md](04-storage-impl.md#21-filedao)

- [ ] **TODO-021**: 实现 ChunkDAO（批量插入 + deleteByPath + 语言统计）
  - 优先级: 🔴 High
  - 预计: 1h 30m
  - 依赖: TODO-019
  - 参考: [04-storage-impl.md](04-storage-impl.md#22-chunkdao)

- [ ] **TODO-022**: 实现 VectorDAO（Float32 序列化 + Base64 编码）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-019
  - 参考: [04-storage-impl.md](04-storage-impl.md#23-vectordao)

- [ ] **TODO-023**: 实现 Hash 工具（SHA256 + xxHash64）
  - 优先级: 🟡 Medium
  - 预计: 30m
  - 依赖: TODO-008
  - 参考: [04-storage-impl.md](04-storage-impl.md#31-hash-计算工具)

- [ ] **TODO-024**: 实现 IncrementalIndexer（Diff 变更检测）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-020, TODO-023
  - 参考: [04-storage-impl.md](04-storage-impl.md#32-变更检测流程)

- [ ] **TODO-025**: 实现 ResumeManager（断点续传机制）
  - 优先级: 🟡 Medium
  - 预计: 1h 30m
  - 依赖: TODO-024
  - 参考: [04-storage-impl.md](04-storage-impl.md#33-断点续传机制)

---

### Phase 4: Embeddings 与检索（11 个任务，预计 14h 30m）

- [ ] **TODO-026**: 实现 OfflineProvider（Transformers.js 集成）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-008
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#12-离线-provider)

- [ ] **TODO-027**: 实现 OpenAIProvider（支持 text-embedding-3-small）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-008
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#13-在线-provider)

- [ ] **TODO-028**: 实现 CustomProvider（自定义 HTTP 端点）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-027
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#自定义-provider)

- [ ] **TODO-029**: 实现 EmbeddingsProviderFactory（统一工厂模式）
  - 优先级: 🟡 Medium
  - 预计: 30m
  - 依赖: TODO-026, TODO-027, TODO-028
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#provider-factory)

- [ ] **TODO-030**: 实现 CodeTokenizer（驼峰/下划线分词）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-008
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#21-代码感知-tokenizer)

- [ ] **TODO-031**: 实现 BM25Index（内存版 + 完整 BM25 算法）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-030
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#22-内存版-bm25)

- [ ] **TODO-032**: 实现 BM25Persistence（JSON 序列化）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-031
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#23-bm25-持久化策略)

- [ ] **TODO-033**: 实现 BM25SQLite（SQLite 持久化）
  - 优先级: 🟡 Medium
  - 预计: 1h 30m
  - 依赖: TODO-031, TODO-019
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#方案-2-sqlite-存储)

- [ ] **TODO-034**: 实现 VectorSearcher（Cosine Similarity + Top-K）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-022
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#41-vectorsearcher-类)

- [ ] **TODO-035**: 实现 RRF 融合算法
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-031, TODO-034
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#3-rrf-融合算法)

- [ ] **TODO-036**: 实现 ContextPacker（Token 计数 + 格式化）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-017, TODO-035
  - 参考: [03-retrieval-impl.md](03-retrieval-impl.md#5-context-packer-实现)

---

### Phase 5: 核心引擎（3 个任务，预计 7h）

- [ ] **TODO-037**: 实现 ContextEngine Facade（统一入口）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-007, TODO-010, TODO-014, TODO-026, TODO-031, TODO-034
  - 参考: [01-architecture-impl.md](01-architecture-impl.md#32-context-engine-facade)

- [ ] **TODO-038**: 实现索引流程编排（Scan -> Chunk -> Embed -> Store）
  - 优先级: 🔴 High
  - 预计: 3h
  - 依赖: TODO-037
  - 参考: [01-architecture-impl.md](01-architecture-impl.md#5-数据流管道实现)

- [ ] **TODO-039**: 实现检索流程编排（Embed -> BM25 + Vector -> RRF -> Pack）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-037
  - 参考: [01-architecture-impl.md](01-architecture-impl.md#5-数据流管道实现)

---

### Phase 6: CLI 与 MCP（10 个任务，预计 14h 30m）

- [ ] **TODO-040**: 实现 ccq index 命令（支持 --full, --watch, --resume）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-038
  - 参考: [05-api-impl.md](05-api-impl.md#11-命令定义)

- [ ] **TODO-041**: 实现 ccq context 命令（支持 --topK）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-039
  - 参考: [05-api-impl.md](05-api-impl.md#11-命令定义)

- [ ] **TODO-042**: 实现 LLMClient（OpenAI 实现）
  - 优先级: 🔴 High
  - 预计: 1h 30m
  - 依赖: TODO-008
  - 参考: [05-api-impl.md](05-api-impl.md#31-llm-client-实现)

- [ ] **TODO-043**: 实现 ccq ask 命令（检索 + LLM 问答）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-039, TODO-042
  - 参考: [05-api-impl.md](05-api-impl.md#32-ask-engine-实现)

- [ ] **TODO-044**: 实现 ccq status 命令（索引统计 + 美化输出）
  - 优先级: 🟡 Medium
  - 预计: 1h 30m
  - 依赖: TODO-037
  - 参考: [05-api-impl.md](05-api-impl.md#41-status-数据收集)

- [ ] **TODO-045**: 实现 FileWatcher（chokidar + 防抖）
  - 优先级: 🟡 Medium
  - 预计: 2h
  - 依赖: TODO-040
  - 参考: [05-api-impl.md](05-api-impl.md#51-文件监听)

- [ ] **TODO-046**: 实现 MCP Server（stdio transport）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-037
  - 参考: [05-api-impl.md](05-api-impl.md#21-server-结构)

- [ ] **TODO-047**: 暴露 codebase_retrieval MCP 工具
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-046
  - 参考: [05-api-impl.md](05-api-impl.md#21-server-结构)

- [ ] **TODO-048**: 暴露 codebase_ask MCP 工具
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-046, TODO-043
  - 参考: [05-api-impl.md](05-api-impl.md#21-server-结构)

- [ ] **TODO-049**: 暴露 codebase_status MCP 工具
  - 优先级: 🟢 Low
  - 预计: 30m
  - 依赖: TODO-046, TODO-044
  - 参考: [05-api-impl.md](05-api-impl.md#21-server-结构)

---

### Phase 7: 配置与集成（5 个任务，预计 6h 30m）

- [ ] **TODO-050**: 定义配置 Schema（Zod 验证）
  - 优先级: 🔴 High
  - 预计: 1h 30m
  - 依赖: TODO-008
  - 参考: [09-config-impl.md](09-config-impl.md#1-配置结构定义)

- [ ] **TODO-051**: 实现 ConfigLoader（YAML 加载 + 默认值合并）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-050
  - 参考: [09-config-impl.md](09-config-impl.md#2-配置加载逻辑)

- [ ] **TODO-052**: 实现 ccq init 命令（生成配置文件）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-051
  - 参考: [09-config-impl.md](09-config-impl.md#3-默认配置生成)

- [ ] **TODO-053**: 实现混合模式（project.md 自动注入）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-039, TODO-051
  - 参考: [06-integration-impl.md](06-integration-impl.md#12-混合模式实现)

- [ ] **TODO-054**: 在 @ccq/workflow 中集成 Engine
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-037, TODO-005
  - 参考: [06-integration-impl.md](06-integration-impl.md#11-ccqworkflow-调用-engine)

---

### Phase 8: 测试与质量保障（10 个任务，预计 15h 30m）

- [ ] **TODO-055**: 配置 Jest 测试环境
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-003
  - 参考: [07-operations-impl.md](07-operations-impl.md#43-单元测试用例详细清单)

- [ ] **TODO-056**: 编写存储层单元测试（DBManager, DAO, Vector 序列化）
  - 优先级: 🔴 High
  - 预计: 3h
  - 依赖: TODO-055, TODO-019, TODO-020, TODO-021, TODO-022
  - 参考: [07-operations-impl.md](07-operations-impl.md#存储层测试)

- [ ] **TODO-057**: 编写索引层单元测试（IgnoreManager, Chunker, Parser）
  - 优先级: 🔴 High
  - 预计: 3h
  - 依赖: TODO-055, TODO-009, TODO-014, TODO-016
  - 参考: [07-operations-impl.md](07-operations-impl.md#索引层测试)

- [ ] **TODO-058**: 编写检索层单元测试（BM25, RRF, VectorSearcher）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-055, TODO-031, TODO-034, TODO-035
  - 参考: [07-operations-impl.md](07-operations-impl.md#检索层测试)

- [ ] **TODO-059**: 编写 E2E 集成测试（完整索引-检索流程）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-055, TODO-038, TODO-039
  - 参考: [07-operations-impl.md](07-operations-impl.md#集成测试)

- [ ] **TODO-060**: 编写性能基准测试脚本（scripts/benchmark.ts）
  - 优先级: 🟡 Medium
  - 预计: 2h
  - 依赖: TODO-037
  - 参考: [07-operations-impl.md](07-operations-impl.md#41-性能基准测试脚本)

- [ ] **TODO-061**: 编写检索质量评估脚本（scripts/eval.ts）
  - 优先级: 🟡 Medium
  - 预计: 2h
  - 依赖: TODO-039
  - 参考: [07-operations-impl.md](07-operations-impl.md#42-检索质量评估)

- [ ] **TODO-062**: 实现 Logger 系统（winston 集成）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-008
  - 参考: [07-operations-impl.md](07-operations-impl.md#11-日志系统)

- [ ] **TODO-063**: 实现全局错误捕获（uncaughtException）
  - 优先级: 🟡 Medium
  - 预计: 30m
  - 依赖: TODO-062
  - 参考: [07-operations-impl.md](07-operations-impl.md#12-全局错误捕获)

- [ ] **TODO-064**: 实现路径安全检查（防止目录遍历）
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-008
  - 参考: [07-operations-impl.md](07-operations-impl.md#22-路径安全检查)

---

### Phase 9: 文档与发布（7 个任务，预计 6h 30m）

- [ ] **TODO-065**: 编写 README.md（使用说明 + API 文档）
  - 优先级: 🔴 High
  - 预计: 2h
  - 依赖: TODO-040, TODO-041, TODO-043, TODO-044
  - 参考: 无

- [ ] **TODO-066**: 编写 CHANGELOG.md
  - 优先级: 🟡 Medium
  - 预计: 30m
  - 依赖: TODO-065
  - 参考: 无

- [ ] **TODO-067**: 创建示例项目（examples/）
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-065
  - 参考: 无

- [ ] **TODO-068**: 运行完整测试套件（确保覆盖率 ≥80%）
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-056, TODO-057, TODO-058, TODO-059
  - 参考: [07-operations-impl.md](07-operations-impl.md#测试覆盖率目标)

- [ ] **TODO-069**: 运行性能基准测试（验证性能指标）
  - 优先级: 🟡 Medium
  - 预计: 30m
  - 依赖: TODO-060, TODO-068
  - 参考: [07-operations-impl.md](07-operations-impl.md#41-性能基准测试脚本)

- [ ] **TODO-070**: 配置 npm 发布脚本（.npmignore, package.json）
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-065
  - 参考: 无

- [ ] **TODO-071**: 发布 @ccq/engine 和 @ccq/workflow 到 npm
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-068, TODO-069, TODO-070
  - 参考: 无

---

## 📌 里程碑

| 里程碑 | 任务范围 | 预计时长 | 目标 |
|--------|----------|----------|------|
| **M1: 基础架构完成** | TODO-001 ~ TODO-008 | 4h 15m | Monorepo 搭建完成，核心接口定义清晰 |
| **M2: 索引系统可用** | TODO-009 ~ TODO-017 | 11h 30m | 支持 TS/JS 代码索引，Fallback 机制完善 |
| **M3: 存储层稳定** | TODO-018 ~ TODO-025 | 10h | SQLite 存储完善，支持增量更新 |
| **M4: 检索功能完成** | TODO-026 ~ TODO-036 | 14h 30m | BM25 + Vector 混合检索可用 |
| **M5: 核心引擎打通** | TODO-037 ~ TODO-039 | 7h | 索引-检索全流程跑通 |
| **M6: CLI 工具完成** | TODO-040 ~ TODO-049 | 14h 30m | 所有 CLI 命令 + MCP Server 可用 |
| **M7: 配置与集成** | TODO-050 ~ TODO-054 | 6h 30m | 配置系统完善，FlowMem 集成完成 |
| **M8: 测试覆盖完成** | TODO-055 ~ TODO-064 | 15h 30m | 测试覆盖率 ≥80%，质量保障完善 |
| **M9: 发布就绪** | TODO-065 ~ TODO-071 | 6h 30m | 文档完善，npm 包发布 |

**总预计时长**: 100h 15m

---

## 🎯 关键路径

最长依赖链（关键路径）：
```
TODO-001 → TODO-002 → TODO-004 → TODO-007 → TODO-008 → TODO-011 → TODO-014 
→ TODO-037 → TODO-038 → TODO-040 → TODO-046 → TODO-047 → TODO-068 → TODO-071
```

**关键路径时长**: 约 22h

---

## 📝 使用说明

### 开发流程建议

1. **按 Phase 顺序执行**：Phase 1 → Phase 2 → ... → Phase 9
2. **优先完成 High 优先级任务**
3. **并行开发机会**：
   - Phase 2 和 Phase 3 部分任务可并行（索引和存储独立开发）
   - Phase 4 的 Embeddings 和 BM25 可并行
   - Phase 8 的测试可在对应功能完成后立即编写

---

## 🔗 相关资源

- **设计文档**: [newDesign.md](../newDesign/*)
- **实施指南**: [implementation/](./*-impl.md)
---

## 💡 注意事项

1. **依赖关系严格遵守**：不要跳过前置依赖任务
2. **测试驱动开发**：核心功能建议先写测试再实现
3. **渐进式发布**：可以在 M5（核心引擎完成）后发布 alpha 版本
4. **文档同步更新**：每个 Phase 完成后及时更新 README
5. **代码审查**：重要模块完成后建议进行代码审查

---
