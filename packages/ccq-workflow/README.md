# @ccq/workflow

FlowMem 工作流引擎 - AI 上下文记忆系统

## 🎯 介绍

@ccq/workflow 是 FlowMem v2 的工作流管理包，提供基于 Markdown 的 AI 上下文记忆系统。通过结构化的工作流程，帮助 AI 更好地理解和执行复杂任务。

### 核心理念

- **存储而非填充**: 将知识持久化到 Markdown 文件，而非反复填充到上下文窗口
- **需求先澄清**: 复杂任务必须先创建 `request.md` 澄清需求
- **单步执行**: 通过 `todolist.md` 管理任务，避免 AI 一次性执行过多步骤
- **编辑器无关**: 支持 7 种主流 AI 编辑器/工具

## 📦 安装

```bash
# 使用 npx 快速初始化
npx @ccq/workflow init

# 或全局安装
npm install -g @ccq/workflow
flowmem init
```

## 🚀 快速开始

### 1. 初始化项目

```bash
# 自动检测编辑器并安装
flowmem init

# 指定编辑器适配器
flowmem init --adapter cursor
flowmem init --adapter claude-code
flowmem init --adapter windsurf
flowmem init --adapter copilot
flowmem init --adapter cline
flowmem init --adapter trae
flowmem init --adapter gemini

# 启用 MCP 集成（配合 @ccq/engine 使用）
flowmem init --with-mcp
```

### 2. 查看状态

```bash
flowmem status
```

### 3. 运行审核

```bash
# 运行所有审核检查
flowmem audit

# 运行特定检查
flowmem audit debt
flowmem audit workflow

# JSON 格式输出
flowmem audit --json
```

### 4. 管理任务列表

```bash
# 查看所有任务
flowmem todo list

# 查看任务统计
flowmem todo stats

# 添加任务
flowmem todo add --content "实现用户认证" --priority high

# 更新任务状态
flowmem todo update --id 1 --status in_progress

# 获取任务详情
flowmem todo get --id 1

# 设置任务字段
flowmem todo set --id 1 --status completed
```

## 📁 目录结构

初始化后会创建以下目录结构：

```
your-project/
├── .flowmem/                    # FlowMem 核心配置（版本控制）
│   ├── docs/                    # 规则文档
│   │   ├── best-practices.md    # 最佳实践
│   │   ├── common-rules-examples.md  # 规则示例
│   │   └── ...
│   └── templates/               # Markdown 模板
│       ├── project.md           # 项目知识库模板
│       ├── request.md           # 需求澄清模板
│       └── todolist.md          # 任务清单模板
│
├── .agentmem/                   # AI 运行时目录（不建议版本控制）
│   ├── project.md               # 项目知识库（可选，见下文）
│   ├── request.md               # 当前任务需求
│   ├── todolist.md              # 当前任务清单
│   └── notes.md                 # 临时研究笔记
│
└── .cursorrules / .clinerules / ... # 编辑器配置文件
```

## 🔄 工作流程

### 传统模式（纯 FlowMem）

```
1. 复杂任务触发
   ↓
2. AI 读取 .agentmem/project.md（项目知识）
   ↓
3. 创建 request.md，多轮澄清需求
   ↓
4. 生成 todolist.md（YAML Frontmatter 格式）
   ↓
5. 单步执行，逐个完成 Todo
   ↓
6. 任务完成，归档到 .agentmem/archives/
```

### 混合模式（FlowMem + ccq-engine）

**推荐使用混合模式**，结合自动索引和人工知识库：

```bash
# 1. 安装 @ccq/engine
npm install @ccq/engine

# 2. 初始化时启用 MCP
flowmem init --with-mcp

# 3. 索引代码库
npx ccq index
```

**工作流变化**：

```
1. 复杂任务触发
   ↓
2. AI 按需调用 codebase_retrieval（自动检索）
   （替代读取 project.md 的全量加载）
   ↓
3. 创建 request.md，多轮澄清（保持不变）
   ↓
4. 生成 todolist.md（保持不变）
   ↓
5. 单步执行时再次调用 codebase_retrieval
   （按需检索相关代码，无需手动维护 project.md）
   ↓
6. 任务完成，归档
```

**project.md 的新定位**：

- **传统模式**: 必须维护，记录所有项目知识（300 行限制）
- **混合模式**: **可选高层摘要**，只记录隐性知识（约定、坑点、决策）

示例 `project.md`（混合模式）：

```markdown
# [项目名称]

## 一句话描述
[这个项目是什么、为谁解决什么问题]

## 技术栈
- 语言: TypeScript
- 框架: Next.js
- 数据库: PostgreSQL

## 🔗 代码检索
项目代码通过 ccq-engine 自动索引，AI 可直接调用 codebase_retrieval 检索。
无需手动维护模块文档。

## ⚠️ 必读注意事项（人工维护）
- [关键坑点1：需要人工标注的特殊约定]
- [关键坑点2：不在代码里但很重要的信息]
```

## 🎨 支持的编辑器

| 编辑器 | 适配器名称 | 配置文件 |
|--------|-----------|---------|
| **Cursor** | `cursor` | `.cursorrules` |
| **Claude Code (Cline)** | `cline` | `.clinerules` |
| **Windsurf** | `windsurf` | `.windsurfrules` |
| **GitHub Copilot** | `copilot` | `.github/copilot-instructions.md` |
| **Trae** | `trae` | `.trae/rules.md` |
| **Google Gemini** | `gemini` | `gemini-rules.md` |
| **Claude Desktop** | `claude-code` | `.claude/` |

## 🔌 MCP 集成（与 @ccq/engine 配合）

启用 `--with-mcp` 后，FlowMem 会生成 MCP 配置文件：

```json
{
  "mcpServers": {
    "ccq-engine": {
      "command": "npx",
      "args": ["-y", "@ccq/engine", "mcp"]
    }
  }
}
```

**手动配置步骤**：

### Claude Desktop
将配置添加到 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

### VS Code (Copilot)
将配置添加到 `.vscode/mcp.json`

### Cursor / Windsurf
参考各编辑器的 MCP 配置文档

## 📋 TodoList 管理

todolist.md 使用 YAML Frontmatter 格式：

```markdown
---
todos:
  - id: 1
    content: "实现用户认证 API"
    status: in_progress
    priority: high
    estimate: "2h"
    created_at: "2026-01-22T10:00:00Z"
  - id: 2
    content: "编写单元测试"
    status: pending
    priority: medium
    estimate: "1h"
---

# 任务清单

当前任务: 用户认证模块开发
```

**状态值**：
- `pending`: 待处理
- `in_progress`: 进行中
- `completed`: 已完成
- `cancelled`: 已取消

**优先级**：
- `high`: 高优先级
- `medium`: 中优先级
- `low`: 低优先级

## 🔍 审核机制

FlowMem 内置审核系统，确保 AI 遵循工作流程规则：

### 内置审核（默认）

```bash
flowmem audit
```

检查项目：
- ✅ 债务检查：project.md 是否及时更新
- ✅ 工作流检查：是否遵循需求澄清 → todolist → 执行流程
- ✅ 文件完整性：必需文件是否存在

### LLM 审核（可选）

需要 MCP 支持，通过 LLM 进行语义级审核。

## 📚 最佳实践

### 1. 何时创建 request.md？

**必须创建**：
- 3+ 文件修改
- 10+ 工具调用
- 用户明确提到「规划」「设计」

**可选**：
- 单文件小改动
- 明确的 bugfix

### 2. 何时使用 project.md？

**传统模式（小项目）**：
- 项目文件数 < 50
- 团队规模 < 3 人
- 手动维护 project.md（300 行限制）

**混合模式（推荐）**：
- 任意规模项目
- 使用 `ccq index` 自动索引代码
- project.md 只记录隐性知识（约 50 行）

### 3. 任务归档

任务完成后自动归档到 `.agentmem/archives/`：

```
.agentmem/archives/
├── 2026-01-22_user-auth/
│   ├── request.md
│   ├── todolist.md
│   └── notes.md
```

## 🆙 升级

```bash
# 升级到最新版本
flowmem upgrade

# 查看版本
flowmem --version
```

## 🤝 与 @ccq/engine 的关系

| 包 | 职责 | CLI 命令 |
|----|------|----------|
| **@ccq/workflow** | 任务流程管理、需求澄清、进度跟踪 | `flowmem init/todo/audit` |
| **@ccq/engine** | 代码语义索引、混合检索、MCP 服务 | `ccq index/context/ask/mcp` |

**依赖关系**：
- `@ccq/workflow` 可独立使用（传统模式）
- 配合 `@ccq/engine` 使用（混合模式，推荐）

## 📖 相关文档

- [FlowMem v2 设计文档](../../docs/v2/design.md)
- [ccq-engine 文档](../ccq-engine/README.md)
- [最佳实践](./adapters/cursor/.flowmem/docs/best-practices.md)
- [规则示例](./adapters/cursor/.flowmem/docs/common-rules-examples.md)

## 📄 许可证

MIT License

---

**如果 FlowMem 对你有用，请给个 ⭐ Star！**
