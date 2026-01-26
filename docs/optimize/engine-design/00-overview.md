# ccq-engine 概述

> 目标：复刻类似 Augment Context Services 的"上下文检索"能力：对本地单仓库进行索引，提供高质量语义检索（Embeddings）+ 关键词检索（BM25）的混合召回，并输出可直接给 LLM 使用的上下文；同时通过 MCP 将检索能力暴露成工具，供 Claude Desktop 与 GitHub Copilot（VS Code）调用。
>
> **v2 更新**：支持 25+ 编程语言、混合模式（project.md + 按需检索）、状态持久化。

---

## 1. 背景与目标

### 1.1 背景

在大中型代码库里，仅靠 grep/关键词匹配难以稳定找到"正确的实现路径"；而纯向量语义检索对符号名、错误码、配置键等"精确词"召回不稳定。一个实用的工程化方案是 **Hybrid Retrieval（BM25 + 向量）**，并通过 **RRF** 这种按排名融合的方式稳定合并两路结果。

此外，想把检索能力无缝接入 Claude、Copilot 这类工具，MCP（Model Context Protocol）提供了统一的"工具/资源"接入标准：Host（IDE/聊天应用）通过 MCP Client 连接 MCP Server，发现工具（tools/list）并调用工具（tools/call）。

### 1.2 与 FlowMem 的关系

**当前 FlowMem 的痛点**：
- `project.md` 需要 AI **手动维护**，依赖"债务机制"强制沉淀，但 AI 经常违规
- **全量加载**：每次都要读整个 project.md，无法按需检索
- **同步延迟**：代码变了但 project.md 没更新
- **信息膨胀**：大项目 project.md 会膨胀（300 行限制仍浪费 tokens）

**ccq-engine 的定位**：
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
│  ccq-engine      代码语义检索             按需检索（新增）       │
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

### 1.5 项目架构（Lerna Monorepo）

整个项目使用 **Lerna** 管理 monorepo，分为两个核心包：

```
flowmem/
├── lerna.json
├── package.json
├── packages/
│   ├── ccq-workflow/        # 工作流相关（原 flowmem 功能）
│   │   ├── src/
│   │   │   ├── cli/         # flowmem init/todo/audit 命令
│   │   │   ├── adapters/    # 编辑器适配器
│   │   │   ├── templates/   # Markdown 模板
│   │   │   └── rules/       # 规则校验
│   │   └── package.json     # @ccq/workflow
│   │
│   └── ccq-engine/          # AI 检索引擎（本设计文档）
│       ├── src/
│       │   ├── cli/         # ccq index/context/ask/mcp 命令
│       │   ├── indexer/     # 索引器（Scanner, Chunker）
│       │   ├── embeddings/  # Embeddings Provider
│       │   ├── retrieval/   # 检索器（BM25, Vector, RRF）
│       │   ├── mcp/         # MCP Server
│       │   └── storage/     # SQLite 存储
│       └── package.json     # @ccq/engine
│
└── docs/
    └── v2/
        └── newDesign/        # 本设计文档
```

**包职责划分**：

| 包 | 职责 | CLI 命令 |
|----|------|----------|
| **@ccq/workflow** | 任务流程管理、需求澄清、进度跟踪 | `flowmem init/todo/audit` |
| **@ccq/engine** | 代码语义索引、混合检索、MCP 服务 | `ccq index/context/ask/mcp` |

**包依赖关系**：

```
@ccq/workflow
    │
    └──▶ @ccq/engine（可选依赖，用于 codebase_retrieval）
```

**发布策略**：
- 独立版本：两个包独立发布、独立版本号
- 用户可单独安装 `@ccq/engine` 用于纯检索场景
- 安装 `@ccq/workflow` 时自动安装 `@ccq/engine`

---

## 2. 范围与约束

### 2.1 适用范围

- **语言栈**：通过 tree-sitter 支持 25+ 编程语言

| 优先级 | 语言 | AST 支持 | 说明 |
|--------|------|----------|------|
| **Tier 1** | TypeScript, JavaScript, Python, Go, Rust, Java | ✅ 完整 | 函数/类/模块边界切分 |
| **Tier 2** | C, C++, C#, Ruby, PHP, Kotlin, Swift | ✅ 完整 | 按需加载 parser |
| **Tier 3** | Bash, SQL, Scala, Lua, Haskell, OCaml | ✅ 基础 | 社区 parser |
| **文本类** | Markdown, JSON, YAML, TOML, XML, HTML, CSS | ✅ 结构化 | 标题/键值/选择器切分 |
| **Fallback** | 其他文本文件 | ⚠️ 字符切分 | maxChars + overlap |

- **仓库规模**：A 档（< 3k chunks）优先，B 档（3k-30k chunks）支持，向量检索采用 brute-force cosine（简单稳定）。

### 2.2 约束

- 必须尊重 `.gitignore/.augmentignore` 排除大目录（node_modules、build 产物、缓存），否则索引会极慢且噪声巨大。
- 在线调用的协议必须可配置，不绑定任何厂商。

---

**相关文档**：
- [01-architecture.md](./01-architecture.md) - 高层架构
- [02-indexing.md](./02-indexing.md) - 索引设计
- [03-retrieval.md](./03-retrieval.md) - 检索设计
