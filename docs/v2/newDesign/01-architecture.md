# 高层架构

## 1. 组件图（概念）

```
          ┌────────────────────────────┐
          │            CLI             │
          │  ccq index/context/ask     │
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

---

## 2. 数据流（Index & Query）

### 2.1 Index 流程

```
1) 扫描仓库文件
       ↓
2) ignore 过滤（.gitignore + .augmentignore）
       ↓
3) 读取内容
       ↓
4) chunk 切分（AST 优先，fallback 字符）
       ↓
5) 计算 embeddings
       ↓
6) 写入 SQLite（chunks + vectors + files）
       ↓
7) 构建 BM25（从 chunks 重建或持久化）
```

### 2.2 Query 流程

```
1) 输入 query
       ↓
2) 向量化 query
       ↓
3) BM25 topK
       ↓
4) Vector topK
       ↓
5) RRF 融合
       ↓
6) 取出 chunks
       ↓
7) pack 成 LLM-ready 上下文字符串（可附带 topK/长度限制）
```

---

## 3. 核心模块职责

| 模块 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **Scanner** | 扫描仓库文件 | 目录路径 | 文件列表 |
| **Ignore** | 过滤非源码文件 | 文件列表 + ignore 规则 | 过滤后文件列表 |
| **Chunker** | 切分文件为 chunks | 文件内容 | Chunk[] |
| **Embeddings** | 向量化 chunks | Chunk[] | Vector[] |
| **BM25 Index** | 关键词索引 | Chunk[] | BM25 倒排索引 |
| **Vector Store** | 存储向量 | Vector[] | SQLite 表 |
| **Retriever** | 混合检索 | query | RRF 排序后的 Chunk[] |
| **Context Packer** | 格式化输出 | Chunk[] | LLM-ready string (Token 计数) |
| **MCP Server** | 暴露检索工具 | MCP 协议 | tools/call 响应 |

---

## 4. 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| **AST Parser** | tree-sitter (WASM) | 25+ 语言支持，按需加载 (Lazy Load) |
| **Tokenizer** | tiktoken / gpt-tokenizer | 精确控制 Context Window，防止溢出 |
| **Embeddings (离线)** | Transformers.js + all-MiniLM-L6-v2 | 浏览器/Node 兼容，384 维 |
| **Embeddings (在线)** | 可配置 HTTP | 适配 OpenAI/内网 API |
| **存储** | SQLite (better-sqlite3) | 单文件、零配置、适合嵌入式 |
| **BM25** | 自实现 / wink-bm25-text-search | 轻量、代码感知 tokenizer |
| **MCP 协议** | @modelcontextprotocol/sdk | 官方 SDK |

---

**相关文档**：
- [00-overview.md](./00-overview.md) - 概述
- [02-indexing.md](./02-indexing.md) - 索引设计
- [03-retrieval.md](./03-retrieval.md) - 检索设计
