# FlowMem Workflow 优化方案 v2.8 - 接入与落地

## 5.1 Claude Code（全量安装）

### 安装方式

```bash
# 初始化 .agentmem 目录 + 安装 Claude Code 适配器
flowmem init --adapter claude-code

# 或交互式选择适配器
flowmem init
```

### 安装内容

安装后会在项目根目录创建以下结构：

```
项目根目录/
├── .agentmem/                    # 工作记忆目录
│   ├── project.md                # 项目配置
│   ├── todolist.md               # 任务清单
│   ├── session.json              # 会话状态
│   ├── logs/                     # 日志目录
│   ├── implementation/           # 实施细化（可选）
│   ├── notepad/                  # 经验记录
│   └── history/                  # 历史归档
│
└── .claude/                      # Claude Code 配置
    ├── commands/flowmem/         # 6 个命令
    │   ├── workflow.md           # 完整四阶段工作流
    │   ├── plan.md               # 需求澄清 + 详细规划
    │   ├── execute.md            # 执行任务
    │   ├── resume.md             # 恢复任务
    │   ├── status.md             # 查看状态
    │   └── audit.md              # 审核检查
    │
    ├── agents/                   # 7 个子代理
    │   ├── flowmem-analyst.md    # 需求分析
    │   ├── flowmem-solver.md     # 方案设计
    │   ├── flowmem-critic.md     # 方案审核
    │   ├── flowmem-planner.md    # 任务分解
    │   ├── flowmem-coder.md      # 代码实现
    │   ├── flowmem-reviewer.md   # 代码审核
    │   └── flowmem-context-curator.md  # 上下文打包
    │
    └── settings.json             # hooks 配置（合并到现有配置）
```

### 子代理（Subagent）配置

子代理使用 Claude Code 官方的 YAML 前置元数据格式：

```yaml
---
name: flowmem-analyst
description: 需求分析专家。在 FlowMem 工作流 Phase 1 中主动使用，评估用户需求的完整性并识别缺失信息。
tools: Read, Grep, Glob
model: sonnet
---

你是需求分析专家...
```

**关键配置字段**：

| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | 唯一标识符，小写字母和连字符 | `flowmem-analyst` |
| `description` | Claude 根据此字段决定何时委托 | 包含"主动使用"触发自动委托 |
| `tools` | 子代理可用的工具 | `Read, Grep, Glob` |
| `model` | 使用的模型 | `sonnet` / `opus` / `haiku` / `inherit` |
| `permissionMode` | 权限模式 | `acceptEdits`（仅 Coder 使用） |

**子代理权限隔离**：

| 子代理 | 工具权限 | permissionMode |
|--------|----------|----------------|
| flowmem-analyst | Read, Grep, Glob | default |
| flowmem-solver | Read, Grep, Glob | default |
| flowmem-critic | Read, Grep, Glob | default |
| flowmem-planner | Read, Grep, Glob | default |
| flowmem-coder | Read, Edit, Write, Bash, Grep, Glob | acceptEdits |
| flowmem-reviewer | Read, Grep, Glob | default |
| flowmem-context-curator | Read, Grep, Glob | default |

### 自动委托机制

Claude 根据子代理的 `description` 字段自动决定何时委托任务。用户也可以明确请求：

```
使用 flowmem-analyst 子代理分析这个需求
让 flowmem-reviewer 子代理审核刚才的代码变更
```

### Hooks 配置

安装时会自动合并以下 hooks 到 `.claude/settings.json`：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          { "type": "command", "command": "flowmem guard check-protected \"$CLAUDE_FILE_PATH\"" },
          { "type": "command", "command": "flowmem guard check-risk \"$CLAUDE_FILE_PATH\"" }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "flowmem guard check-protected \"$CLAUDE_FILE_PATH\"" },
          { "type": "command", "command": "flowmem guard check-risk \"$CLAUDE_FILE_PATH\"" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "flowmem guard log-change \"$CLAUDE_FILE_PATH\" -o \"$CLAUDE_TOOL_NAME\"" }
        ]
      }
    ]
  }
}
```

### 使用方式

```bash
# 启动完整工作流
/flowmem:workflow 实现用户登录功能

# 仅规划（Phase 1-2）
/flowmem:plan 添加购物车功能

# 执行已有计划
/flowmem:execute

# 查看状态
/flowmem:status

# 恢复中断的任务
/flowmem:resume

# 运行审核检查
/flowmem:audit
```

---

## 5.2 其他 IDE（v1 最简接入）

适用于 Cursor、Windsurf、Cline、Copilot、Trae、Gemini 等工具。

### 安装方式

```bash
# 初始化 + 安装适配器
flowmem init --adapter cursor
flowmem init --adapter windsurf
flowmem init --adapter cline
flowmem init --adapter copilot
flowmem init --adapter trae
flowmem init --adapter gemini

# 或交互式选择
flowmem init
```

### 安装内容

```
项目根目录/
├── .agentmem/                    # 工作记忆目录
│   └── ...
│
├── .cursorrules                  # Cursor 规则文件
│   或 .windsurfrules             # Windsurf 规则文件
│   或 .clinerules                # Cline 规则文件
│   或 .github/copilot-instructions.md  # Copilot 规则文件
│   或 .trae/rules/context-memory.md    # Trae 规则文件
│   或 gemini-rules.md            # Gemini 规则文件
│
└── .flowmem/                     # 模板和示例
    ├── templates/
    └── examples/
```

### 规则文件内容

所有非 Claude Code 的 IDE 使用统一的 `common-rules.md` 作为规则源，包含：

1. **四阶段工作流**（简化版，无子代理）
2. **债务机制**（知识沉淀）
3. **TodoList YAML 格式规范**
4. **自我审核机制**（替代 Reviewer 子代理）
5. **高风险变更升级门槛**
6. **7 条关键规则**
7. **AI 自检清单**

### 简化流程要点

1. **触发条件明确**：涉及 3+ 文件 / 10+ 工具调用 / 新功能
2. **必须产出**：`request.md` 与 `todolist.md`
3. **输出即执行约束**：关键动作必须输出提示并立即执行
4. **自我审核**：每个任务完成后必须自我审核（无独立 Reviewer）
5. **任务归档**：任务结束必须归档并记录摘要

---

## 5.3 数据源架构

### 两套独立数据源

| 数据源 | 适用 IDE | 位置 | 特点 |
|--------|----------|------|------|
| **commands + agents** | Claude Code | `templates/commands/*.md` + `templates/agents/*.md` | 利用子代理、commands 等特性 |
| **common-rules.md** | 其他 IDE | `adapters/common-rules.md` | 通用规则，无子代理 |

### 构建适配器

```bash
# 构建所有适配器
flowmem build-adapters

# 只构建指定适配器
flowmem build-adapters --only claude-code
flowmem build-adapters --only cursor
```

构建后的适配器包位于 `adapters/` 目录：

```
adapters/
├── claude-code/
│   └── .claude/
│       ├── commands/flowmem/     # 6 个命令
│       ├── agents/               # 7 个子代理
│       └── settings.example.json # hooks 配置示例
│
├── cursor/
│   ├── .cursorrules              # 规则文件
│   └── .flowmem/                 # 模板和示例
│
├── windsurf/
├── cline/
├── copilot/
├── trae/
├── gemini/
└── common-rules.md               # 通用规则源文件
```

---

## 5.4 CLI 命令参考

### flowmem init

```bash
flowmem init [options]

选项:
  -f, --force           强制重新初始化（覆盖现有文件）
  -a, --adapter <name>  指定要安装的 IDE 适配器
  --list-adapters       列出所有可用的适配器
  --skip-templates      跳过模板文件创建
  --skip-adapter        跳过适配器安装（不弹出选择）
  --adapter-only        仅安装适配器，跳过 .agentmem 初始化
```

### flowmem todo

```bash
flowmem todo <command> [options]

命令:
  list                  列出所有任务
  stats                 查看进度统计
  get --id <id>         获取任务详情
  add --content <text>  添加任务
  set --id <id>         更新任务

选项:
  --status <status>     任务状态 (pending/in_progress/completed/cancelled)
  --priority <level>    优先级 (high/medium/low)
  --estimate <time>     预估时间 (5m/1h/2d)
  --phase <name>        阶段名称
  --acceptance <text>   验收条件（可多次使用）
```

### flowmem audit

```bash
flowmem audit [checks...] [options]

检查项:
  debt                  检查知识债务
  sync                  检查文件同步
  todo                  检查任务状态
  dependency-check      检查依赖关系

选项:
  --json                JSON 格式输出
  --lazy                检查偷懒代码
```

### flowmem guard

```bash
flowmem guard <command> [options]

命令:
  check-protected <path>  检查是否为受保护文件
  check-risk <path>       检查是否为高风险路径
  log-change <path>       记录文件变更
```

---

## 5.5 实施计划与 MVP

### 已完成

- [x] CLI 基础框架（commander + TypeScript）
- [x] `flowmem init` 命令（含交互式适配器选择）
- [x] `flowmem todo` 命令（YAML 格式 todolist）
- [x] `flowmem audit` 命令（含依赖检查）
- [x] `flowmem guard` 命令（hooks 集成）
- [x] `flowmem build-adapters` 命令
- [x] Claude Code 子代理模板（7 个）
- [x] Claude Code 命令模板（6 个）
- [x] 其他 IDE 通用规则（common-rules.md）
- [x] settings.json 合并逻辑

### 待完成

- [ ] Context Curator 触发逻辑
- [ ] 会话恢复机制
- [ ] 回滚命令实现
- [ ] 效果验证测试集

---

## 5.6 预期收益

| 指标 | 现状 | 优化后 | 提升 |
|------|------|--------|------|
| AI 违规率 | 30-40% | <5% | ↓ 85% |
| 代码偷懒率 | 20-30% | <5% | ↓ 80% |
| 需求返工率 | 40% | <15% | ↓ 60% |
| 任务完成可靠性 | 70% | 95% | ↑ 25% |
| 上下文污染 | 高 | 低 | 明显下降 |
| 多工具可用性 | 低 | 中 | 提升 |
