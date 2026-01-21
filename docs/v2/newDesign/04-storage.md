# 存储设计

## 1. 表结构（SQLite）

### 1.1 核心表

```sql
-- 文件元数据（增量判断）
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  mtime_ms INTEGER,
  size INTEGER,
  hash TEXT,
  indexed_at TEXT              -- ISO 8601 时间戳
);

-- Chunk 内容
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,           -- path:idx 格式
  path TEXT,
  idx INTEGER,
  text TEXT,
  start_line INTEGER,            -- 行号范围
  end_line INTEGER,
  chunk_type TEXT,               -- func/class/section/text
  symbol_name TEXT,              -- 函数名/类名（可选）
  chunk_hash TEXT                -- chunk 内容 hash（V1.5 用于复用）
);

-- 向量存储
CREATE TABLE vectors (
  id TEXT PRIMARY KEY,           -- 与 chunks.id 对应
  dim INTEGER,
  b64 TEXT                       -- base64 编码的 float32 数组
);

-- 索引元数据（V1 新增）
CREATE TABLE index_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 索引
CREATE INDEX idx_chunks_path ON chunks(path);
CREATE INDEX idx_chunks_type ON chunks(chunk_type);
CREATE INDEX idx_chunks_symbol ON chunks(symbol_name);
CREATE INDEX idx_files_hash ON files(hash);
```

**index_meta 存储内容**：

| key | value 示例 | 说明 |
|-----|-----------|------|
| status | ready/indexing/failed | 索引状态 |
| last_indexed | 2026-01-21T17:00:00Z | 最后索引时间 |
| git_branch | main | 当前 Git 分支 |
| git_commit | abc123ef | 当前 Git 提交 |
| total_files | 234 | 文件总数 |
| total_chunks | 2847 | Chunk 总数 |
| version | 1.0.0 | 索引格式版本 |

## 2. 增量更新策略

### 2.1 触发机制

- **手动触发（V1）**：
  - `ccq index`：全量扫描，增量更新
  - `ccq index --watch`：监听文件变化，防抖 3s 后自动索引

- **自动触发（V2 可选）**：
  - Git Hook：commit/checkout 时触发
  - IDE 插件：保存时触发（防抖 5s）

### 2.2 文件级增量判断

```
扫描文件 → 计算 hash → 与 files 表比对
  ├─ hash 相同 → 跳过（复用旧 chunks/vectors）
  ├─ hash 不同 → 删除旧数据 → 重新切分 → 重新 embedding
  └─ 新文件    → 切分 → embedding → 写入
```

**Hash 策略**：
- 使用 `SHA256(文件内容)` 作为唯一标识
- 对比 `files.hash` 字段判断文件是否变更

**性能优化**：
- 单文件变更：只重建该文件的 chunks/vectors
- 多文件变更：批量 embedding（batchSize=32）

### 2.3 Chunk 级智能复用（V1.5 优化）

当前 V1 策略：文件变更 → 删除所有 chunks → 全部重建

**V1.5 优化方案**：
```
文件变更 → AST 对比 → 标记变更的函数/类
  ├─ 未变更的 chunk → 复用旧 vector
  └─ 变更的 chunk    → 重新 embedding
```

**收益**：
- 大文件修改 1 函数：embedding 时间从 5s 降到 <500ms
- 适用于频繁迭代的开发场景

### 2.4 删除文件处理

```
扫描完成 → 对比 files 表与实际文件
  └─ files 表中存在但磁盘不存在 → 删除 chunks/vectors/files 记录
```

**清理策略**：
- 每次 `ccq index` 结束后自动清理
- 删除操作使用事务（避免部分删除）

### 2.5 并发与一致性

| 问题 | 策略 |
|------|------|
| **索引中修改文件** | 下次索引重新扫描（基于 hash 判断） |
| **索引失败** | SQLite 事务回滚 + 标记状态为 "indexing_failed" |
| **多进程并发** | 使用文件锁（.ccq/.lock）防止并发索引 |

**事务边界**：
- 单文件索引为一个事务（失败不影响其他文件）
- 最终一次性提交索引状态更新

### 2.6 分支切换处理（与 Git 集成）

**策略**：
```
检测到分支切换（通过 .git/HEAD）
  → 全量扫描 + 增量更新（基于 hash）
  → 自动清理已删除文件
```

**Git Hook 集成（V2 可选）**：
```bash
# .git/hooks/post-checkout
#!/bin/bash
ccq index --async &
```

---

## 3. 存储体积评估

基于典型项目规模，评估索引数据库的存储占用：

### 3.1 存储模型

```
总存储 = Chunks 表 + Vectors 表 + Files 表 + BM25 索引 + SQLite 开销
```

**各部分存储估算**：

| 组件 | 单条大小 | 说明 |
|------|----------|------|
| **Chunks 表** | ~1.5KB/chunk | text(~1200 chars) + 元数据(~300 bytes) |
| **Vectors 表** | ~1.5KB/chunk | 384 维 float32 = 1536 bytes (b64 ~2KB) |
| **Files 表** | ~200 bytes/file | path + hash + mtime |
| **BM25 索引** | ~0.3KB/chunk | token 倒排索引（内存/持久化） |
| **SQLite 开销** | ~10-15% | 索引、WAL、页对齐 |

### 3.2 典型项目存储估算

| 项目规模 | 文件数 | Chunks 数 | 源码体积 | 索引体积 | 索引/源码比 |
|----------|--------|-----------|----------|----------|-------------|
| **小型**（个人项目） | 50 | 300 | 500KB | **~1.2MB** | 2.4x |
| **中型**（创业公司） | 300 | 2,000 | 5MB | **~7MB** | 1.4x |
| **中大型**（团队项目） | 1,000 | 5,000 | 15MB | **~18MB** | 1.2x |
| **大型**（企业级） | 3,000 | 15,000 | 50MB | **~55MB** | 1.1x |
| **超大型**（Monorepo） | 10,000 | 50,000 | 200MB | **~180MB** | 0.9x |

### 3.3 Embedding 模型对存储的影响

| 模型 | 维度 | 单 Vector 大小 | 2k chunks 占用 |
|------|------|----------------|----------------|
| **all-MiniLM-L6-v2**（默认） | 384 | 1.5KB | 3MB |
| all-mpnet-base-v2 | 768 | 3KB | 6MB |
| text-embedding-ada-002 | 1536 | 6KB | 12MB |
| text-embedding-3-large | 3072 | 12KB | 24MB |

**建议**：使用 384 维模型（all-MiniLM-L6-v2）在质量和存储间取得平衡。

---

**相关文档**：
- [02-indexing.md](./02-indexing.md) - 索引设计
- [03-retrieval.md](./03-retrieval.md) - 检索设计
- [07-operations.md](./07-operations.md) - 运维与性能
