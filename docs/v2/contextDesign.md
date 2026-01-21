# ctx-engine 设计文档（Design Doc）

> 目标：复刻类似 Augment Context Services 的“上下文检索”能力：对本地单仓库进行索引，提供高质量语义检索（Embeddings）+ 关键词检索（BM25）的混合召回，并输出可直接给 LLM 使用的上下文；同时通过 MCP 将检索能力暴露成工具，供 Claude Desktop 与 GitHub Copilot（VS Code）调用。

---

## 1. 背景与目标

### 1.1 背景
在大中型 TS/JS 代码库里，仅靠 grep/关键词匹配难以稳定找到“正确的实现路径”；而纯向量语义检索对符号名、错误码、配置键等“精确词”召回不稳定。一个实用的工程化方案是 **Hybrid Retrieval（BM25 + 向量）**，并通过 **RRF** 这种按排名融合的方式稳定合并两路结果。

此外，想把检索能力无缝接入 Claude、Copilot 这类工具，MCP（Model Context Protocol）提供了统一的“工具/资源”接入标准：Host（IDE/聊天应用）通过 MCP Client 连接 MCP Server，发现工具（tools/list）并调用工具（tools/call）。

### 1.2 目标（Goals）
- **本地单仓库**：无需上传仓库到第三方（默认离线 embeddings），可选在线能力。
- **可解释的上下文输出**：输出包含文件路径与 chunk 标识，便于人工校验与追溯。
- **用户自主触发**：索引/检索/生成都由用户命令显式触发。
- **双通道接入**：CLI + MCP（stdio）两种使用方式。
- **可配置在线协议**：在线 embeddings/LLM 通过可配置 HTTP 协议适配任意服务（OpenAI 风格、内网网关、自建 API）参考: https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E6%96%87%E6%9C%AC%E5%B5%8C%E5%85%A5

### 1.3 非目标（Non-goals）
- 不做“自动改代码”的 Agent（只提供上下文检索与可选问答）。
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
│  - Chunker                                   │
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
1) 扫描仓库文件 → 2) ignore 过滤 → 3) 读取内容 → 4) chunk 切分 → 5) 计算 embeddings → 6) 写入 SQLite（chunks + vectors + files）→ 7) 构建 BM25（从 chunks 重建或持久化）。

**Query 流程**
1) 输入 query → 2) 向量化 query → 3) BM25 topK → 4) Vector topK → 5) RRF 融合 → 6) 取出 chunks → 7) pack 成 LLM-ready 上下文字符串（可附带 topK/长度限制）。

---

## 4. 关键设计点

### 4.1 Ignore 策略
- 默认读取 `.gitignore` + `.augmentignore`。
- 目标：避免索引非源码大目录、构建产物、缓存、二进制。
- `.augmentignore` 推荐模板见 README（本设计文档不重复）。

### 4.2 Chunk 策略
MVP：按字符长度切分（maxChars + overlap）。
- 优点：实现简单、通用。
- 缺点：可能切断函数/语义单元。

可选增强（后续）：
- 使用 tree-sitter/AST 以函数/类/导出块作为 chunk 边界。
- 对 Markdown 按 heading 分段。

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
- 采用简易 tokenizer：按非字母数字/下划线分隔。
- BM25 适合精确词匹配：符号名、错误码、配置键。

可选增强：
- 语言感知 tokenizer（保留 `foo.bar`, `foo_bar`, `foo-bar`）。
- 对代码 tokens 做 camelCase 分裂。

### 4.5 Rank Fusion（RRF）
- 输入：BM25 排名列表、Vector 排名列表。
- 输出：融合后的 docId 排名。
- RRF 仅依赖 rank，不依赖 score，适合不同检索器分数不可比场景。

### 4.6 Context Packer（LLM-ready 输出）
输出格式建议：

```
FILE: path/to/file.ts
CHUNK: 0
---
<chunk text>

FILE: ...
```

好处：
- 可追溯（路径 + chunk id）
- 可控长度（maxChars）

可选增强：
- 标注行号（需要 chunker 记录字符到行的映射）。
- 增加相似度/相关性分数用于调试（不放进最终 context 或可开关）。

---

## 5. 存储设计（SQLite）

### 5.1 表结构
- `files(path, mtimeMs, size, hash)`：用于增量索引判断。
- `chunks(id, path, idx, text)`：保存 chunk 内容。
- `vectors(id, dim, b64)`：保存 float32 embedding（base64）。

### 5.2 增量更新策略
- 对扫描到的文件计算 hash，与 `files` 表比对：
  - 新文件/变更文件：删除该文件旧 chunks/vectors，重建。
  - 未变更文件：跳过。

可选增强：
- 清理已删除文件：扫描结束后对比 `files` 表与当前文件列表。

---

## 6. 接口设计

### 6.1 CLI 命令
- `ctx index`：增量索引。
- `ctx context <query> --topK N --maxChars M`：输出上下文字符串。
- `ctx ask <question>`：先检索再调用在线 LLM（需 mode.llm=online）。
- `ctx mcp`：启动 MCP stdio server。

### 6.2 MCP 工具
暴露一个工具：
- `codebase_retrieval({ query, topK?, maxChars? }) -> text`

设计选择：
- 只暴露只读工具（不会对文件系统写入）。
- 输出为 text content，便于各类 host 直接注入到模型上下文。

---

## 7. Claude Desktop 集成

Claude Desktop 支持本地 MCP server（stdio）并可通过配置文件注册服务；也支持以 Desktop Extensions 的方式安装 MCP server（.mcpb）。

推荐：开发阶段使用手动配置（command + args + env），稳定后再考虑打包成扩展。

---

## 8. GitHub Copilot（VS Code）集成

VS Code 的 Copilot Chat 支持通过 MCP servers 扩展工具与上下文来源，可通过 `.vscode/mcp.json` 配置本地 MCP server；并可通过命令面板查看/管理服务器与工具。

需要注意：企业/组织策略可能禁用 MCP，需要管理员开启相关政策。

---

## 9. 安全与合规

- 本地 MCP server 具备在用户机器运行任意代码的能力，必须只配置可信服务。
- API key 必须通过环境变量注入，不建议写入仓库。
- ignore 规则要排除包含敏感信息的文件/目录（如 `.env`、密钥文件），避免被索引并被模型消费。

---

## 10. 质量保障与评估

### 10.1 功能测试
- 索引：
  - 空仓库/小仓库
  - 文件新增/修改/删除
  - ignore 生效（node_modules 不应进入 files/chunks）
- 检索：
  - 精确词（BM25 应命中）
  - 同义改写（向量应命中）
  - 融合结果（RRF 输出稳定）

### 10.2 指标（可选）
- recall@k / nDCG（需要标注集）
- 查询延迟：embedding vs 检索耗时占比
- 噪声比：输出 context 中无关 chunk 的占比

---

## 11. 未来路线图（Roadmap）

### 11.1 V1（MVP，可用）
- ignore + chunk + embeddings + BM25 + RRF + context pack
- CLI + MCP

### 11.2 V2（质量提升）
- Contextual Retrieval：为 chunk 生成简短“定位上下文”并前置（需要在线 LLM 或离线小模型）
- Rerank：对 topN 候选进行精排

### 11.3 V3（结构化理解）
- tree-sitter 分块 + 符号索引（定义/引用）
- 轻量依赖图（imports/calls）用于 query expansion

---

