# ctx-engine 设计文档（Design Doc）

> 目标：复刻类似 Augment Context Services 的"上下文检索"能力：对本地单仓库进行索引，提供高质量语义检索（Embeddings）+ 关键词检索（BM25）的混合召回，并输出可直接给 LLM 使用的上下文；同时通过 MCP 将检索能力暴露成工具，供 Claude Desktop 与 GitHub Copilot（VS Code）调用。

---

## 1. 背景与目标

### 1.1 背景

在大中型 TS/JS 代码库里，仅靠 grep/关键词匹配难以稳定找到"正确的实现路径"；而纯向量语义检索对符号名、错误码、配置键等"精确词"召回不稳定。一个实用的工程化方案是 **Hybrid Retrieval（BM25 + 向量）**，并通过 **RRF** 这种按排名融合的方式稳定合并两路结果。

此外，想把检索能力无缝接入 Claude、Copilot 这类工具，MCP（Model Context Protocol）提供了统一的"工具/资源"接入标准：Host（IDE/聊天应用）通过 MCP Client 连接 MCP Server，发现工具（tools/list）并调用工具（tools/call）。

### 1.2 与 FlowMem 的关系

**当前 FlowMem 的痛点**：
- `project.md` 需要 AI **手动维护**，依赖"债务机制"强制沉淀，但 AI 经常违规
- **全量加载**：每次都要读整个 project.md，无法按需检索
- **同步延迟**：代码变了但 project.md 没更新
- **信息膨胀**：大项目 project.md 会膨胀（300 行限制仍浪费 tokens）

**ctx-engine 的定位**：
```
┌─────────────────────────────────────────────────────────────────┐
│                    FlowMem 工作流                               │
├─────────────────────────────────────────────────────────────────┤
│  request.md      任务级需求澄清           手动维护（保留）       │
│  todolist.md     任务级执行跟踪           CLI 维护（保留）       │
│  notes.md        临时研究笔记             手动维护（保留）       │
├─────────────────────────────────────────────────────────────────┤
│  project.md      项目知识库               ⬇️ 自动化替代          │
│                                          ⬇️                      │
│  ctx-engine      代码语义检索             按需检索（新增）       │
│                  + 自动索引                                      │
└─────────────────────────────────────────────────────────────────┘
```

**核心改变**：
- **project.md 从"必须维护"变为"可选摘要"**
- **代码理解从"全量加载"变为"按需检索"**
- **废除债务机制**：不再强制 AI 手动沉淀，代码知识自动索引

### 1.3 目标（Goals）

- **本地单仓库**：无需上传仓库到第三方（默认离线 embeddings），可选在线能力。
- **可解释的上下文输出**：输出包含文件路径、行号范围与 chunk 标识，便于人工校验与追溯。
- **用户自主触发**：索引/检索/生成都由用户命令显式触发。
- **双通道接入**：CLI + MCP（stdio）两种使用方式。
- **可配置在线协议**：在线 embeddings/LLM 通过可配置 HTTP 协议适配任意服务（OpenAI 风格、内网网关、自建 API）。
- **与 FlowMem 无缝集成**：作为 FlowMem v2 的核心组件。

### 1.4 非目标（Non-goals）

- 不做"自动改代码"的 Agent（只提供上下文检索与可选问答）。
- 不做多仓库/跨服务全局索引（后续可扩展）。
- 不追求在 >10 万 chunks 规模下的极致性能（A 档规模优先）。

---

## 2. 范围与约束

### 2.1 适用范围

- 语言栈：TS/JS 为主，兼容 JSON/MD/YAML 等文本。
- 仓库规模：A 档（< 3k chunks）优先，向量检索采用 brute-force cosine（简单稳定）。

### 2.2 约束

- 必须尊重 `.gitignore/.augmentignore` 排除大目录（node_modules、build 产物、缓存），否则索引会极慢且噪声巨大。
- 在线调用的协议必须可配置，不绑定任何厂商。

---

## 3. 高层架构

### 3.1 组件图（概念）

```
          ┌────────────────────────────┐
          │            CLI             │
          │  ctx index/context/ask     │
          └───────────┬────────────────┘
                      │
                      │ uses
                      ▼
┌──────────────────────────────────────────────┐
│                 Context Engine               │
│  - Scanner + Ignore rules                    │
│  - Chunker (字符 / AST 混合)                 │
│  - Embeddings Provider (offline/online)      │
│  - BM25 index                                │
│  - Vector store (SQLite b64 vectors)         │
│  - Rank fusion (RRF)                         │
│  - Context packer (LLM-ready string)         │
└───────────────────────────┬──────────────────┘
                            │
                            │ optional
                            ▼
                   ┌─────────────────┐
                   │   LLM Provider  │
                   │   (online)      │
                   └─────────────────┘

          ┌────────────────────────────┐
          │            MCP             │
          │  stdio server / tools      │
          └───────────┬────────────────┘
                      │
                      ▼
         Claude Desktop / GitHub Copilot (VS Code)
```

### 3.2 数据流（Index & Query）

**Index 流程**
1) 扫描仓库文件 → 2) ignore 过滤 → 3) 读取内容 → 4) chunk 切分（AST 优先，fallback 字符） → 5) 计算 embeddings → 6) 写入 SQLite（chunks + vectors + files）→ 7) 构建 BM25（从 chunks 重建或持久化）。

**Query 流程**
1) 输入 query → 2) 向量化 query → 3) BM25 topK → 4) Vector topK → 5) RRF 融合 → 6) 取出 chunks → 7) pack 成 LLM-ready 上下文字符串（可附带 topK/长度限制）。

---

## 4. 关键设计点

### 4.1 Ignore 策略

- 默认读取 `.gitignore` + `.augmentignore`。
- 目标：避免索引非源码大目录、构建产物、缓存、二进制。
- `.augmentignore` 推荐模板见 README（本设计文档不重复）。

### 4.2 Chunk 策略（混合方案）

**V1：AST 优先 + 字符 Fallback**

| 文件类型 | 切分策略 | 边界 |
|----------|----------|------|
| `.ts/.tsx/.js/.jsx` | tree-sitter AST | 函数/类/导出块 |
| `.md` | Heading 分段 | `## / ###` 标题 |
| `.json/.yaml` | 顶层 key 分块 | 对象/数组边界 |
| 其他文本 | 字符切分 | maxChars + overlap |

**AST 切分规则（TS/JS）**：
- 每个**顶层函数声明**为独立 chunk
- 每个**导出块（export）**为独立 chunk
- 每个**类定义**为独立 chunk（含方法）
- **import 语句**合并为单独 chunk
- 超长函数（>2000 chars）做二次切分

**Markdown 切分规则**：
- 以 `##` 或 `###` 为分割点
- 每个 section 为独立 chunk
- 保留 heading 作为 chunk 元数据

**字符切分参数**（Fallback）：
- `maxChars`: 1500
- `overlap`: 200

### 4.3 Embeddings Provider（离线/在线）

- 离线默认：Transformers.js feature-extraction pipeline，模型 `Xenova/all-MiniLM-L6-v2`。
- 在线：可配置 HTTP Provider：
  - request：method/url/headers/bodyTemplate
  - response：JSON Pointer 定位 vectors/text
  - env：`${ENV:KEY}`

设计要点：
- 对 embeddings 结果做 normalize（离线已 normalize；在线可加可选 normalize）。
- 支持 batch（batchSize），避免单条请求过慢。

### 4.4 BM25 索引

- 采用**代码感知 tokenizer**：
  - 按非字母数字/下划线分隔
  - camelCase 分裂：`getUserById` → `get`, `User`, `By`, `Id`
  - snake_case 分裂：`get_user_by_id` → `get`, `user`, `by`, `id`
  - 保留原始 token：`getUserById` 也作为完整 token 保留

- BM25 适合精确词匹配：符号名、错误码、配置键。

### 4.5 Rank Fusion（RRF）

- 输入：BM25 排名列表、Vector 排名列表。
- 输出：融合后的 docId 排名。
- RRF 仅依赖 rank，不依赖 score，适合不同检索器分数不可比场景。
- 参数 `k=60`（标准 RRF 常数）。

### 4.6 Context Packer（LLM-ready 输出）

输出格式：

```
=== FILE: path/to/file.ts (lines 42-78) ===
CHUNK: func:getUserById
---
export async function getUserById(id: string): Promise<User> {
  const user = await db.users.findOne({ id });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

=== FILE: path/to/service.ts (lines 15-32) ===
CHUNK: class:UserService
---
export class UserService {
  constructor(private db: Database) {}
  
  async getUser(id: string) {
    return this.db.users.findOne({ id });
  }
}
```

**元数据包含**：
- 文件路径
- 行号范围（startLine - endLine）
- Chunk 类型标识（func/class/section/text）
- 可选：相关性分数（调试模式）

---

## 5. 存储设计（SQLite）

### 5.1 表结构

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

### 5.2 增量更新策略

#### 5.2.1 触发机制

```
┌──────────────────────────────────────────────────────────────┐
│  手动触发（V1）                                               │
│  - ctx index              全量扫描，增量更新                  │
│  - ctx index --watch      watch 模式（后台监听文件变化）      │
├──────────────────────────────────────────────────────────────┤
│  自动触发（V2 可选）                                          │
│  - Git Hook               commit/checkout 时触发              │
│  - IDE 插件               保存时触发（防抖 5s）                │
└──────────────────────────────────────────────────────────────┘
```

**V1 策略（手动 + watch）**：
- 默认：用户执行 `ctx index` 手动触发
- Watch 模式：`ctx index --watch` 监听文件变化，防抖 3s 后自动索引

**防抖机制**：
- 连续修改同一文件，3s 内只触发 1 次索引
- 批量修改多文件，等待静默 3s 后统一索引

#### 5.2.2 文件级增量判断

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

#### 5.2.3 Chunk 级智能复用（V1.5 优化）

当前 V1 策略：文件变更 → 删除所有 chunks → 全部重建

**问题**：
- 用户只改了 1 个函数，但整个文件 50 个函数的 embeddings 全部重算
- 浪费计算资源和时间

**V1.5 优化方案**：

```
文件变更 → AST 对比 → 标记变更的函数/类
  ├─ 未变更的 chunk → 复用旧 vector
  └─ 变更的 chunk    → 重新 embedding
```

**实现思路**：
1. 计算新旧文件的 AST diff
2. 对比函数/类的 hash（基于 AST 节点）
3. 只对变更节点重新 embedding

**收益**：
- 大文件修改 1 函数：embedding 时间从 5s 降到 <500ms
- 适用于频繁迭代的开发场景

#### 5.2.4 删除文件处理

```
扫描完成 → 对比 files 表与实际文件
  └─ files 表中存在但磁盘不存在 → 删除 chunks/vectors/files 记录
```

**清理策略**：
- 每次 `ctx index` 结束后自动清理
- 删除操作使用事务（避免部分删除）

#### 5.2.5 并发与一致性

**问题场景**：
- 索引进行中，用户继续修改代码
- 索引失败，数据库处于不一致状态

**解决方案**：

| 问题 | 策略 |
|------|------|
| 索引中修改文件 | 下次索引重新扫描（基于 hash 判断） |
| 索引失败 | SQLite 事务回滚 + 标记状态为 "indexing_failed" |
| 多进程并发 | 使用文件锁（.ctx/.lock）防止并发索引 |

**事务边界**：
- 单文件索引为一个事务（失败不影响其他文件）
- 最终一次性提交索引状态更新

#### 5.2.6 分支切换处理（与 Git 集成）

**场景**：
- 用户从 feature 分支切到 main 分支
- 代码内容完全不同，索引需要更新

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
ctx index --async &
```

- checkout 后台触发索引
- 不阻塞 Git 操作

#### 5.2.7 索引状态管理

新增 `index_meta` 表：

```sql
CREATE TABLE index_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 存储状态
INSERT INTO index_meta VALUES 
  ('status', 'ready'),           -- ready/indexing/failed
  ('last_indexed', '2026-01-21T17:00:00Z'),
  ('git_branch', 'main'),
  ('git_commit', 'abc123');
```

**状态机**：

```
ready → indexing → ready
         ↓
       failed → (手动重试) → indexing
```

**用户可见状态**：

```bash
$ ctx status
Status: ✅ Ready
Last indexed: 2 minutes ago
Branch: main (abc123)
Files: 234 | Chunks: 2,847 | Size: 45.2 MB
```

---

## 6. 接口设计

### 6.1 CLI 命令

```bash
# 索引（增量）
ctx index [--full]              # --full 强制全量重建

# 检索上下文
ctx context <query> [options]
  --topK N                      # 返回 top N chunks（默认 10）
  --maxChars M                  # 最大字符数限制（默认 8000）
  --format json|text            # 输出格式（默认 text）

# 问答（需在线 LLM）
ctx ask <question>              # 先检索再调用在线 LLM

# 启动 MCP Server
ctx mcp                         # stdio 模式

# 索引状态
ctx status                      # 查看索引统计
```

### 6.2 MCP 工具

暴露两个工具：

```typescript
// 代码库检索
codebase_retrieval({
  query: string,
  topK?: number,      // 默认 10
  maxChars?: number,  // 默认 8000
  filter?: {
    path?: string,    // 路径前缀过滤
    type?: string     // chunk 类型过滤
  }
}) -> text

// 索引状态（只读）
codebase_status() -> {
  totalFiles: number,
  totalChunks: number,
  lastIndexed: string,
  indexSize: string
}
```

设计选择：
- 只暴露只读工具（不会对文件系统写入）。
- 输出为 text content，便于各类 host 直接注入到模型上下文。

---

## 7. FlowMem 集成

### 7.1 新工作流

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 复杂任务触发                                                  │
│    - 3+ 文件修改 / 10+ 工具调用 / 用户提到「规划」               │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. AI 按需检索（NEW - 替代读 project.md）                        │
│    - 调用 codebase_retrieval("用户需求相关关键词")               │
│    - 获取相关代码 chunks                                         │
│    - 无需手动维护 project.md                                     │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 创建 request.md，多轮澄清（保留）                             │
│    - 记录原始需求                                                │
│    - AI 提出澄清问题                                             │
│    - 用户回答后立即更新                                          │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. 用户确认后生成 todolist.md（保留）                            │
│    - YAML Frontmatter 格式                                       │
│    - flowmem todo CLI 管理                                       │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. 单步执行，按需检索（NEW - 替代刷新上下文）                    │
│    - 执行 1 个 Todo                                              │
│    - 需要理解代码时调用 codebase_retrieval                       │
│    - 无需"债务机制"，无需手动沉淀                                 │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. 任务完成，归档（保留）                                        │
│    - 归档 request.md / todolist.md                               │
│    - 无需维护 project.md                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 规则变更

**删除/修改的规则**：

| 旧规则 | 变更 |
|--------|------|
| 规则 1: 必须先读 project.md | **删除** - 改为按需 codebase_retrieval |
| 规则 5: 债务机制 | **删除** - 代码知识自动索引，无需手动沉淀 |
| 规则 6: 刷新上下文顺序 | **简化** - todolist → request（不再需要 project） |
| 三秒检查: 债务 ≥3? | **删除** |
| 检查点协议: 债务 X/3 | **删除** |

**保留的规则**：

| 规则 | 说明 |
|------|------|
| 规则 2: 需求先澄清 | 保留 request.md 流程 |
| 规则 3: 单步执行 | 保留 todolist 执行节奏 |
| 规则 4: 存储而非填充 | 保留 |
| 规则 7: 任务完成清理 | 保留归档机制 |

**新增的规则**：

```markdown
### 规则 X: 按需检索

**何时检索**：
- 需要理解某模块的实现方式
- 需要找到相关代码位置
- 需要了解某个符号/函数的用法

**如何检索**：
- 直接调用 codebase_retrieval("具体问题或关键词")
- 不需要预先读取任何文件

**不需要检索**：
- 已知具体文件路径 → 直接 Read file
- 简单问答 → 直接回答
```

### 7.3 project.md 的新定位（可选）

project.md 从"必须维护"变为"可选高层摘要"：

```markdown
# [项目名称]

## 一句话描述
[这个项目是什么、为谁解决什么问题]

## 技术栈
- 语言: TypeScript
- 框架: Next.js
- 数据库: PostgreSQL

## 🔗 代码检索
项目代码通过 ctx-engine 自动索引，AI 可直接调用 codebase_retrieval 检索。
无需手动维护模块文档。

## ⚠️ 必读注意事项（人工维护）
- [关键坑点1：需要人工标注的特殊约定]
- [关键坑点2：不在代码里但很重要的信息]
```

**只保留**：
- 项目基本信息（一句话描述、技术栈）
- 人工标注的特殊注意事项

**不再需要**：
- 模块详解
- API 文档
- 目录结构

### 7.4 AI 使用指引（写入 common-rules.md）

```markdown
## 代码检索 vs 直接读取

| 场景 | 操作 |
|------|------|
| 需要找代码位置 | `codebase_retrieval("关键词")` |
| 需要理解某模块 | `codebase_retrieval("模块名 + 功能描述")` |
| 已知具体路径 | `Read file` |
| 需要修改文件 | `Read file` → `Edit file` |

**示例**：
```
用户: "帮我修改登录逻辑"

AI 操作:
1. codebase_retrieval("登录 login authentication") 
   → 获取相关代码 chunks
2. 根据 chunks 确定具体文件路径
3. Read file 读取完整文件
4. Edit file 修改
```
```

---

## 8. Claude Desktop 集成

Claude Desktop 支持本地 MCP server（stdio）并可通过配置文件注册服务；也支持以 Desktop Extensions 的方式安装 MCP server（.mcpb）。

**配置示例（claude_desktop_config.json）**：

```json
{
  "mcpServers": {
    "ctx-engine": {
      "command": "npx",
      "args": ["ctx-engine", "mcp"],
      "env": {
        "CTX_ROOT": "/path/to/project"
      }
    }
  }
}
```

推荐：开发阶段使用手动配置（command + args + env），稳定后再考虑打包成扩展。

---

## 9. GitHub Copilot（VS Code）集成

VS Code 的 Copilot Chat 支持通过 MCP servers 扩展工具与上下文来源，可通过 `.vscode/mcp.json` 配置本地 MCP server；并可通过命令面板查看/管理服务器与工具。

**配置示例（.vscode/mcp.json）**：

```json
{
  "servers": {
    "ctx-engine": {
      "command": "npx",
      "args": ["ctx-engine", "mcp"]
    }
  }
}
```

需要注意：企业/组织策略可能禁用 MCP，需要管理员开启相关政策。

---

## 10. 安全与合规

- 本地 MCP server 具备在用户机器运行任意代码的能力，必须只配置可信服务。
- API key 必须通过环境变量注入，不建议写入仓库。
- ignore 规则要排除包含敏感信息的文件/目录（如 `.env`、密钥文件），避免被索引并被模型消费。

---

## 11. 性能要求

### 11.1 SLA 目标

| 操作 | 规模 | 目标延迟 |
|------|------|----------|
| 首次索引 | <3k chunks | <60s |
| 增量索引 | 10 文件变更 | <5s |
| 检索查询 | topK=10 | <500ms |
| MCP 工具调用 | - | <1s |

### 11.2 资源限制

- 索引文件：单文件 <1MB（跳过大文件）
- 内存占用：索引过程 <500MB
- 磁盘占用：.ctx/ 目录 <100MB（3k chunks 规模）

---

## 12. 质量保障与评估

### 12.1 功能测试

- 索引：
  - 空仓库/小仓库
  - 文件新增/修改/删除
  - ignore 生效（node_modules 不应进入 files/chunks）
  - AST 切分正确性（函数/类边界）
- 检索：
  - 精确词（BM25 应命中）：`getUserById`
  - 同义改写（向量应命中）："获取用户信息"
  - 融合结果（RRF 输出稳定）
  - 行号范围准确性

### 12.2 指标（可选）

- recall@k / nDCG（需要标注集）
- 查询延迟：embedding vs 检索耗时占比
- 噪声比：输出 context 中无关 chunk 的占比

---

## 13. 未来路线图（Roadmap）

### 13.1 V1（MVP，可用）

**核心功能**：
- [x] ignore 策略（.gitignore + .augmentignore）
- [x] Chunk 切分（AST 优先 + 字符 Fallback）
- [x] Embeddings（离线 Transformers.js）
- [x] BM25 + Vector 混合检索 + RRF 融合
- [x] Context Packer（LLM-ready 输出）
- [x] CLI（index / context / ask / mcp）
- [x] MCP Server（stdio）
- [x] FlowMem 集成（替代 project.md + 债务机制）

**增量索引（V1 手动模式）**：
- [x] 文件级 hash 判断
- [x] 手动触发 `ctx index`
- [x] 删除文件自动清理
- [ ] Watch 模式 `ctx index --watch`
- [ ] 进度条（首次索引）
- [ ] 行号范围追踪

**预期效果**：
- 首次索引 <3k chunks：<60s
- 检索查询：<500ms
- 基本满足日常开发需求

---

### 13.2 V1.5（性能优化）

**Chunk 级智能复用**：
- AST diff 对比（只重建变更函数）
- 大幅降低增量索引时间（5s → <500ms）

**检索质量提升**：
- Contextual Retrieval：为 chunk 生成简短"定位上下文"
- Rerank：对 topN 候选进行精排
- 符号索引：快速跳转到定义/引用

**开发体验**：
- Git Hook 自动索引（post-checkout / post-commit）
- IDE 插件（VS Code / Cursor）

---

### 13.3 V2（结构化理解）

**依赖关系**：
- 轻量依赖图（imports/calls）
- 跨文件关联：自动关联 import 的模块
- Query expansion：扩展查询到相关模块

**智能缓存**：
- 问答缓存：相似问题复用结果
- 预热索引：常用查询预计算

**多仓库支持**（可选）：
- 跨仓库检索
- Monorepo 子包感知

---

### 13.4 发布计划

| 版本 | 时间线 | 里程碑 |
|------|--------|--------|
| V1.0 | Week 1-2 | 基础功能 + 手动索引 |
| V1.1 | Week 3 | Watch 模式 + 行号追踪 |
| V1.5 | Week 4-5 | Chunk 级复用 + 检索质量 |
| V2.0 | Week 6-8 | 结构化理解 + Git 集成 |

---

## 14. 索引更新最佳实践

### 14.1 开发流程中的索引策略

| 场景 | 推荐策略 | 命令 |
|------|----------|------|
| **开始新任务** | 手动索引一次 | `ctx index` |
| **开发中频繁修改** | Watch 模式（后台监听） | `ctx index --watch` |
| **Git 分支切换** | 自动触发（V2 可选） | 配置 post-checkout hook |
| **发布前** | 全量重建索引 | `ctx index --full` |

### 14.2 性能优化建议

| 问题 | 优化方案 |
|------|----------|
| 首次索引慢 | 确保 `.gitignore` 正确排除 node_modules/dist |
| 频繁修改大文件 | 启用 V1.5 chunk 级复用 |
| 多人协作频繁拉取 | Git hook 自动索引 |
| CI/CD 环境 | 缓存 `.ctx/` 目录，只做增量更新 |

### 14.3 故障恢复

```bash
# 索引损坏或不一致
ctx index --full --force      # 强制全量重建

# 检查索引状态
ctx status

# 查看索引日志
ctx logs
```

---

## 附录 A：配置文件示例

**.ctx/config.yaml**

```yaml
# 索引配置
index:
  ignore:
    - .gitignore
    - .augmentignore
  maxFileSize: 1MB
  
# Chunk 配置
chunker:
  astEnabled: true
  fallback:
    maxChars: 1500
    overlap: 200

# Embeddings 配置
embeddings:
  mode: offline  # offline | online
  offline:
    model: Xenova/all-MiniLM-L6-v2
  online:
    url: https://api.example.com/embeddings
    headers:
      Authorization: "Bearer ${ENV:API_KEY}"
    batchSize: 32

# 检索配置
retrieval:
  topK: 10
  maxChars: 8000
  rrf:
    k: 60
```

---

## 附录 B：常见问题

**Q: 首次索引很慢怎么办？**
A: 确保 .gitignore 正确排除 node_modules 等大目录。使用 `ctx status` 检查索引统计。

**Q: 检索结果不准确？**
A: 尝试更具体的查询词。精确符号名用 BM25 效果更好，描述性问题用语义检索。

**Q: 如何与 IDE 的代码搜索配合？**
A: ctx-engine 适合语义理解和跨文件关联；IDE 搜索适合精确文本匹配。两者互补。

---

