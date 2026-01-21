# FlowMem v2 - CCQ Engine + AI 上下文记忆系统

> 🧠 **像 Manus 一样工作** — 使用持久化的 Markdown 文件作为 AI 的"磁盘上的工作记忆"

---

## 🎯 介绍

FlowMem v2 是一个基于 Lerna Monorepo 的项目，包含两个核心包：

### 1. @ccq/engine
**代码库上下文查询引擎** — 提供智能代码检索功能

- ✅ AST 感知的代码切分（基于 Tree-sitter）
- ✅ 混合检索（BM25 + Vector + RRF）
- ✅ SQLite 持久化存储
- ✅ 支持 TypeScript、Python、Go、Rust
- ✅ MCP Server 集成

### 2. @ccq/workflow
**FlowMem 工作流引擎** — AI 上下文记忆管理系统

- ✅ CLI 工具（flowmem init, audit, status, upgrade）
- ✅ AI 上下文记忆管理
- ✅ 编辑器适配器集成（7 个编辑器）
- ✅ TodoList 管理（YAML Frontmatter）

---

## 📦 Monorepo 结构

```
flowmem/
├── packages/
│   ├── ccq-engine/               # CCQ 引擎包
│   └── ccq-workflow/           # FlowMem 工作流包
├── docs/                         # 文档
├── .agentmem/                     # AI 运行时（用户目录）
└── 配置文件
```

---

## 🚀 快速开始

### 安装 CCQ Engine

```bash
# 安装依赖
npm install

# Bootstrap monorepo
lerna bootstrap

# 索引代码库
npx @ccq/engine index

# 语义搜索
npx @ccq/engine context "如何处理用户认证"

# AI 问答
npx @ccq/engine ask "这个项目的架构是什么？"

# MCP 模式
npx @ccq/engine-mcp
```

### 安装 FlowMem

```bash
# 一键安装到当前项目
npx @ccq/workflow init

# 指定编辑器
npx @ccq/workflow init --adapter cursor

# 查看状态
npx @ccq/workflow status

# 运行审核
npx @ccq/workflow audit
```

---

## 📚 文档

| 文档 | 描述 |
|------|------|
| **设计文档** | [docs/v2/design.md](docs/v2/design.md) |
| **实施指南** | [docs/v2/implementation/](docs/v2/implementation/) |
| **任务清单** | [docs/v2/implementation/todolist.md](docs/v2/implementation/todolist.md) ✅ |
| **项目结构** | [STRUCTURE.md](STRUCTURE.md) |

---

## 🛠️ 开发

```bash
# 安装所有依赖
npm install

# Bootstrap monorepo
lerna bootstrap

# 运行所有测试
lerna run test

# 构建所有包
lerna run build

# 开发模式（并行）
lerna run dev --parallel
```

---

## 🧪 测试

```bash
# 运行所有测试
lerna run test

# 运行特定包的测试
lerna run test --scope @ccq/engine

# 查看覆盖率
lerna run test -- --coverage
```

---

## 📦 包说明

### @ccq/engine

| 功能 | 状态 |
|------|------|
| AST 感知代码切分 | ✅ |
| 混合检索（BM25 + Vector + RRF） | ✅ |
| SQLite 持久化存储 | ✅ |
| MCP Server 集成 | ✅ |
| CLI 命令（index, context, ask, status） | ✅ |

### @ccq/workflow

| 功能 | 状态 |
|------|------|
| CLI 工具（init, audit, status, upgrade） | ✅ |
| TodoList 管理（YAML Frontmatter） | ✅ |
| 7 个编辑器适配器 | ✅ |
| 自动审核机制 | ✅ |

---

## 📊 统计数据

- **总任务数**: 71
- **完成任务**: 71 (100%) ✅
- **创建文件数**: 60+
- **代码行数**: ~3500+

---

## 🔄 版本

### v2.0.0 (2026-01-21)

**新增**:
- ✨ Monorepo 架构（Lerna）
- ✨ @ccq/engine 包（CCQ 引擎）
- ✨ @ccq/workflow 包（FlowMem 工作流）
- ✨ TypeScript 支持
- ✨ MCP Server 集成
- ✨ AST 感知代码切分
- ✨ 混合检索引擎

---

## 🙏️ 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**如果 FlowMem 对你有用，请给个 ⭐ Star！**
