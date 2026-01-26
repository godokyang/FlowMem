# FlowMem Workflow v2.8 使用指南

> 四阶段工作流 + 多 Agent 架构 + 偷懒检测

## 快速开始

### 1. 安装

**方式 A: npm 安装（推荐）**

```bash
# 全局安装
npm install -g @ccq/workflow

# 或在项目中安装
npm install --save-dev @ccq/workflow

# 初始化项目
flowmem init
```

**方式 B: 手动复制适配器包**

根据你使用的 IDE，复制对应的适配器包：

| IDE | 适配器目录 | 规则文件位置 |
|-----|-----------|-------------|
| Claude Code | `adapters/claude-code/` | `.claude/skills/context-memory-system/SKILL.md` |
| Cursor | `adapters/cursor/` | `.cursorrules` |
| Windsurf | `adapters/windsurf/` | `.windsurfrules` |
| Trae | `adapters/trae/` | `.trae/rules/context-memory.md` |
| Cline | `adapters/cline/` | `.clinerules` |
| Copilot | `adapters/copilot/` | `.github/copilot-instructions.md` |
| Gemini | `adapters/gemini/` | `gemini-rules.md` |

```bash
# 示例：安装 Claude Code 适配器
cp -r adapters/claude-code/.claude ./
```

### 2. 配置项目

编辑 `.agentmem/project.md`，填写：

```yaml
# 项目名称
[你的项目名称]

# 技术栈
- 语言: TypeScript
- 框架: Next.js

# Workflow 配置
workflow:
  risk:
    high_paths:
      - "auth/"
      - "security/"
      - "migrations/"
  tests:
    primary:
      - "npm test"
      - "npm run build"
```

### 3. 启用 Claude Code Hooks（可选，仅 Claude Code）

```bash
# 复制示例配置
cp .claude/settings.example.json .claude/settings.json
```

这会启用：
- 保护文件写入拦截
- 高风险路径检查
- 变更日志记录

---

## 使用方式

### 自动触发

当你的需求满足以下任一条件时，AI 会自动启动四阶段工作流：

- 预估修改 ≥3 个文件
- 预估工具调用 ≥10 次
- 提到"规划"、"设计"等关键词
- 涉及新功能开发

### 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        四阶段工作流                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: 需求澄清                                              │
│  ─────────────────                                              │
│  • AI 分析需求完整性，评分 < 7 分会追问                          │
│  • AI 设计技术方案，内部审核迭代                                 │
│  • 🟡 用户确认方案 → 生成 request.md                            │
│                                                                 │
│  Phase 2: 详细规划                                              │
│  ─────────────────                                              │
│  • AI 将方案分解为可执行任务                                     │
│  • 🟡 用户确认计划 → 生成 todolist.md                           │
│                                                                 │
│  Phase 3: 执行与审核                                            │
│  ────────────────────                                           │
│  • AI 逐个执行任务                                               │
│  • 每个任务自动审核（检测偷懒代码）                              │
│  • 审核不通过自动重试                                            │
│                                                                 │
│  Phase 4: 交付                                                  │
│  ──────────                                                     │
│  • 运行测试                                                      │
│  • 生成交付报告                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 用户介入点

| 介入点 | 时机 | 操作 |
|--------|------|------|
| 方案确认 | Phase 1 结束 | 回复"确认"继续，或提出修改意见 |
| 计划确认 | Phase 2 结束 | 回复"确认"继续，或调整任务 |
| 追问回答 | 需求评分不足时 | 回答 AI 的问题，或说"用默认方案" |
| 高风险确认 | 涉及敏感路径时 | 确认是否继续 |

### 常用命令

```bash
# 初始化 .agentmem 目录
flowmem init
flowmem init --force  # 强制重新初始化

# 任务管理
flowmem todo list                              # 查看任务列表
flowmem todo list --status pending             # 按状态筛选
flowmem todo list --phase 3                    # 按阶段筛选
flowmem todo list --json                       # JSON 格式输出

flowmem todo add "实现用户登录功能"             # 添加任务
flowmem todo add "修复 bug" --priority high    # 指定优先级
flowmem todo add "重构代码" --phase 3          # 指定阶段

flowmem todo set --id TODO-001 --status completed    # 更新状态
flowmem todo set --id TODO-001 --priority critical   # 更新优先级

flowmem todo get TODO-001                      # 查看任务详情
flowmem todo stats                             # 查看进度统计
flowmem todo delete TODO-001                   # 删除任务
flowmem todo clear                             # 清空已完成任务

# 审核检查
flowmem audit                                  # 运行所有检查
flowmem audit --lazy                           # 只检查偷懒代码
flowmem audit --todo                           # 只检查任务完成情况
flowmem audit lazy ./src                       # 检查指定目录的偷懒代码
flowmem audit debt ./src                       # 检查技术债务

# 文件保护（用于 Claude Code Hooks）
flowmem guard check-protected package.json     # 检查文件是否受保护
flowmem guard check-risk src/auth/login.ts     # 检查是否高风险路径
flowmem guard log-change src/app.ts -o modify  # 记录文件变更
flowmem guard list-protected                   # 列出保护规则
flowmem guard trace                            # 查看变更日志
flowmem guard check-core-mem                   # 检查核心记忆文件
flowmem guard check-todo-align src/app.ts      # 检查变更是否与 todo 对齐

# 上下文刷新（AI 专用）
flowmem context                                # 完整输出所有核心文件
flowmem context summary                        # 摘要模式
flowmem context todo                           # 仅输出当前任务

# 任务归档
flowmem archive                                # 归档当前任务到 history/
flowmem archive my-feature                     # 指定任务名称
flowmem archive --dry-run                      # 预览将要归档的文件

# 构建适配器包（开发者用）
flowmem build-adapters                         # 构建所有 IDE 适配器
flowmem build-adapters --only cursor           # 只构建指定适配器
```

---

## 目录结构

安装后，项目会新增以下目录：

```
.agentmem/
├── project.md              # 项目配置（长期维护）
├── request.md              # 当前需求（任务周期）
├── todolist.md             # 任务清单（任务周期）
├── analysis.md             # 需求分析结果
├── plan.md                 # 技术方案
├── review.md               # 审核结果
├── context.md              # 上下文摘要（可选）
├── session.json            # 会话状态
├── logs/                   # 日志目录
│   ├── trace.jsonl         # 变更追踪
│   ├── review-TODO-XXX.md  # 审核记录
│   └── retry-TODO-XXX.md   # 重试记录
├── implementation/         # 实施细化（复杂任务）
├── notepad/                # 经验记录
└── history/                # 历史归档
```

---

## 简化路径

不是所有任务都需要完整流程：

| 路径 | 条件 | 跳过的步骤 |
|------|------|-----------|
| **完整路径** | ≥3 文件或新功能 | 无 |
| **简化路径** | ≤2 文件，非高风险 | Solver+Critic 迭代 |
| **极简路径** | ≤1 文件，≤30 行，非新功能 | Analyst + 方案确认 |

> 注意：即使是极简路径，Reviewer 审核也不会跳过。

---

## 偷懒检测

以下代码会被自动拒绝：

```javascript
// ❌ 占位符
console.log('TODO')

// ❌ 空实现
function doSomething() {}

// ❌ 未实现异常
throw new Error('Not implemented')

// ❌ 硬编码测试数据
return { id: 1, name: 'test' }
```

---

## 回滚

如果需要撤销变更：

| 命令 | 说明 |
|------|------|
| `/rollback todo` | 撤销当前任务 |
| `/rollback phase` | 回退到上一个确认点 |
| `/rollback full` | 撤销所有变更 |

---

## FAQ

**Q: 小任务也要走完整流程吗？**

A: 不需要。小任务会自动走简化或极简路径。

**Q: 可以跳过某个阶段吗？**

A: 可以输入 `/skip` 跳过，但会记录跳过原因。

**Q: AI 一直追问怎么办？**

A: 回复"用默认方案"可以跳过追问。

**Q: 如何自定义高风险路径？**

A: 在 `.agentmem/project.md` 的 `workflow.risk.high_paths` 中配置。

---

## 参考资源

- 设计文档: `docs/optimize/design/`
- Agent 模板: `templates/agents/`
- 示例: `examples/`
