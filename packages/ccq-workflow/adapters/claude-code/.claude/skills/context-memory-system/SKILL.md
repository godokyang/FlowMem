---
name: context-memory-system
description: FlowMem 上下文记忆系统 v2.8。支持四阶段工作流、多 Agent 架构、偷懒检测与 Claude Code Hooks。
autorun: true
---

# 上下文记忆系统规则 (v2.8)

> 🚨 **工具覆盖规则（最高优先级）**
>
> 当 FlowMem 启用时，以下内置工具**必须禁用**，改用文件系统：
> - ❌ **todowrite / todoread** → 使用 `flowmem todo` CLI 命令
> - ❌ **task / background_task 的 TODO 功能** → 使用 `flowmem todo` CLI 命令
> - ❌ **直接 Edit/Write todolist.md** → 使用 `flowmem todo` CLI 命令
> - ❌ **AI 内置记忆/上下文管理** → 使用 `.agentmem/project.md` 等持久化文件
>
> **强制要求**：
> 1. 所有 todolist 操作**必须**通过 `flowmem todo` CLI
> 2. 其他文件（project.md, request.md）使用 Read/Write/Edit 工具

> 🛑 **混合模式检查（启用 MCP 时）:**
> 1. 需要理解代码？→ 优先调用 `codebase_retrieval`
> 2. project.md 还需要吗？→ 只记录隐性知识（约定/坑点）
> 3. 检索≥3次？→ 不再强制沉淀（代码已自动索引）

> 使用持久化 Markdown 文件管理 AI 工作记忆
> **v2.8 新增**: 四阶段工作流 + 多 Agent 架构 + Claude Code Hooks 支持

---

## 四阶段工作流（v2.8 核心）

### 何时触发？

满足以下**任一条件**时触发四阶段工作流：
- 预估修改 ≥3 个文件
- 预估工具调用 ≥10 次
- 用户明确提到"规划"、"设计"
- 涉及新功能开发

### 流程总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        四阶段工作流                              │
│                                                                 │
│  🔵 = AI 自主执行    🟡 = 用户介入点                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: 需求澄清                    输出: request.md          │
│  ───────────────────                  ─────────────────         │
│  🔵 1.1 上下文检索 (工具内置优先 / ccq-engine 可选)             │
│  🔵 1.2 需求完整性评分 (Analyst)                                │
│     └─ 🟡 <7分则追问用户补充信息                                │
│  🔵 1.3 方案迭代 (Solver + Critic，最多 2 轮)                   │
│  🟡 1.4 用户确认方案 → 生成 request.md                          │
│                                                                 │
│  Phase 2: 详细规划                    输出: todolist.md         │
│  ───────────────────                  ─────────────────         │
│  🔵 2.0 实施细化 (implementation 目录，可选)                    │
│  🔵 2.1 WBS 任务分解 (Planner)                                  │
│  🔵 2.2 依赖识别 + 工作量估算 (任务点)                          │
│  🟡 2.3 用户确认 → 生成 todolist.md                             │
│                                                                 │
│  Phase 3: 执行与审核                  默认无需用户介入           │
│  ────────────────────                 ────────────────          │
│  🔵 3.1 单步执行 (Coder，每次1个Todo)                           │
│  🔵 3.2 自动审核 (Reviewer)                                     │
│  🔵 3.3 审核不通过 → 自动重做                                   │
│  🔵 3.4 更新 todolist.md 状态 (使用 flowmem todo CLI)           │
│                                                                 │
│  Phase 4: 交付                        输出: 交付报告             │
│  ──────────                           ─────────────             │
│  🔵 4.1 最终审查 (对照验收标准)                                  │
│  🔵 4.2 运行测试 (按项目配置/兜底策略)                           │
│  🔵 4.3 生成交付报告                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**固定介入点**: 方案确认 + 规划确认（2 次）
**可变介入点**: 需求评分追问、中途需求变更、Reviewer 无法自动修复、高风险变更

### 简化路径（小任务）

满足以下条件可走简化路径：
- 影响 ≤2 文件，且不涉及核心模块/高风险路径
- 无需跨模块协作

简化路径仍需产出 `.agentmem/request.md` 与 `.agentmem/todolist.md`，但可跳过 Solver+Critic 迭代。

### 极简路径（微任务）

满足以下**全部**条件可走极简路径：
- 影响 ≤1 文件
- 预估修改 ≤30 行代码
- 用户需求描述清晰（≥30 字且无歧义词如"优化"、"改进"）
- 非高风险路径
- 非新功能（仅修复、调整、重命名等）

极简路径跳过 Analyst 和方案确认，但 **Reviewer 审核不可跳过**。

---

## Agent 架构（Claude Code 专用）

### Agent 清单（7 个）

| Agent | 职责 | 调用时机 | 输入 | 输出 |
|-------|------|----------|------|------|
| **Orchestrator** | 流程控制、状态管理、用户交互 | 全程 | 用户请求 | 协调指令、最终输出 |
| **Analyst** | 需求分析、完整性评分、追问 | Phase 1.2 | 用户需求 + 代码上下文 | 评分 + 追问问题 |
| **Solver** | 方案设计 | Phase 1.3 | 需求 + 上下文 + Critic 反馈 | 技术方案 |
| **Critic** | 方案审核、找问题 | Phase 1.3 | 方案 + 需求 + 约束 | 通过/问题清单 |
| **Planner** | 任务分解、WBS、依赖分析 | Phase 2 | request.md | todolist.md |
| **Coder** | 代码实现 | Phase 3 | 单个 todo + 上下文 | 代码变更 |
| **Reviewer** | 代码审核、质量把关 | Phase 3 | 代码变更 + 验收条件 | 通过/拒绝 + 理由 |

### Subagent 权限隔离

- **Reviewer/Critic**: 只读（禁 Write/Edit/Bash）
- **Planner/Analyst**: 允许检索工具
- **Coder**: 允许写入（acceptEdits）
- **Orchestrator**: 留在主会话，不作为独立 Subagent

### 上下文隔离与通信

- Subagent 独立上下文 + 独立 loop，主会话只收摘要
- 共享仅通过 `.agentmem/*` 文件传递
- Background Subagent 不能使用 MCP 工具，涉及检索的任务需前台执行

---

## 核心文件

| 文件 | 定位 | 生命周期 |
|------|------|----------|
| `.agentmem/project.md` | 项目整体描述 + workflow 配置 | 长期维护 |
| `.agentmem/request.md` | 当前需求澄清（Phase 1 产出） | 任务周期 |
| `.agentmem/todolist.md` | 任务清单(YAML格式)（Phase 2 产出） | 任务周期 |
| `.agentmem/analysis.md` | Analyst 分析结果 | 任务周期 |
| `.agentmem/plan.md` | Solver 方案 | 任务周期 |
| `.agentmem/review.md` | Critic 审核结果 | 任务周期 |
| `.agentmem/context.md` | Context Curator 产出（可选） | 任务周期 |
| `.agentmem/session.json` | 会话状态（用于恢复） | 任务周期 |
| `.agentmem/logs/` | 日志目录 | 任务周期 |
| `.agentmem/implementation/` | 实施细化目录（可选） | 任务周期 |
| `.agentmem/notepad/` | 经验记录目录（可选） | 长期积累 |
| `.agentmem/history/` | 历史归档 | 永久保留 |

**🔴 project.md vs request.md 边界:**
- 下次任务还有用？→ `project.md`
- 本次需求边界/确认细节？→ `request.md`

---

## 项目级策略配置（可选）

在 `.agentmem/project.md` 中可集中配置风险与测试策略，存在则优先使用。

```yaml
workflow:
  risk:
    high_paths:
      - "auth/"
      - "security/"
      - "migrations/"
      - "db/"
      - "infra/"
      - ".github/workflows/"
      - ".env"
  tests:
    primary:
      - "lsp_diagnostics"
      - "npm test"
      - "npm run build"
    fallback:
      - "pytest"
      - "go test ./..."
  reviewer:
    skip_checks: []  # 可选跳过的检查项
  context_curator: true  # 是否启用 Context Curator
```

---

## TodoList 格式规范（v1.1.0+）

### YAML Frontmatter 格式

todolist.md 使用 **YAML Frontmatter + Markdown** 混合格式：

```yaml
---
meta:
  title: "任务标题"
  created: "ISO 8601 时间"
  updated: "ISO 8601 时间"
  request_ref: ".agentmem/request.md"
  total_points: 13
  progress: 0%
todos:
  - id: "TODO-001"
    content: "任务描述"
    status: "pending"           # pending/in_progress/completed/cancelled
    priority: "high"             # high/medium/low
    estimate: "30m"              # 5m/1h/2d 标准化格式
    dependencies: ["TODO-002"]   # 依赖任务 ID
    phase: "阶段名称"
    acceptance:                  # 验收条件（v2.8 新增）
      - "验收条件1"
      - "验收条件2"
    log: "logs/review-TODO-001.md"  # 可选
---
# Markdown 内容（自动生成）
```

### 状态标记（4 种）
- `[ ]` **pending** - 未开始
- `[/]` **in_progress** - 进行中（同时只能有 1 个）
- `[x]` **completed** - 已完成
- `[-]` **cancelled** - 已取消

### 优先级标记（3 级）
- 🔴 **high** - 紧急且重要
- 🟡 **medium** - 重要但不紧急
- 🟢 **low** - 可以延后

### 时间格式（标准化）
- `5m` / `30m` - 分钟
- `1h` / `2h` - 小时
- `1d` / `2d` - 天（1天=8小时）

### 依赖关系
- **基础验证**：dependencies 中的 ID 必须存在
- **循环检测**：自动检测并阻止循环依赖（DFS 算法）
- **审核命令**：`flowmem audit dependency-check`

### 🚫 AI 操作规则（CRITICAL）

**操作前检查点：**
1. ❓ 我要修改 todolist.md 吗？→ **禁止 Edit/Write，必须用 CLI**
2. ❓ 我要添加/更新任务吗？→ **必须用 `flowmem todo` 命令**
3. ❓ 我要修改其他文件吗？→ 使用 Read/Write/Edit 工具

**CLI 命令参考：**
```bash
# 查看任务
flowmem todo list       # 列出所有任务（按阶段分组）
flowmem todo stats      # 查看进度统计（含进度条）
flowmem todo get --id TODO-001  # 获取任务详情（JSON）

# 添加任务
flowmem todo add --content "任务" --priority high --estimate 30m

# 更新任务
flowmem todo set --id TODO-001 --status completed
flowmem todo set --id TODO-001 --priority high
```

**进度条自动更新：** 每次操作后自动插入到 todolist.md 顶部
```
[████████░░░░░░░░░░░░] 44%
总任务: 34 | 已完成: 15 (44%)
```

---

## Reviewer 审核机制（v2.8 核心）

### 审核清单

| 级别 | 检查项 | 必须通过 |
|------|--------|----------|
| **Critical** | 代码有实际逻辑（非 console.log/TODO） | ✅ |
| **Critical** | lsp_diagnostics 无错误 | ✅ |
| **Critical** | 满足 todo 的 acceptance 条件 | ✅ |
| Major | 代码符合项目规范 | 建议 |
| Major | 错误处理完整 | 建议 |
| Minor | 命名清晰、注释适当 | 可选 |

### 偷懒检测规则

以下模式视为偷懒，**必须拒绝**：
- `console.log('TODO')`
- `// TODO: implement`
- 空函数体 `{}`
- `throw new Error('Not implemented')`
- 硬编码测试数据

### 重试策略

当 Reviewer 审核不通过时：
1. **第 1 次重试**：Coder 根据反馈修改
2. **第 2 次重试**：重新检索上下文后修改
3. **仍失败**：升级到用户，提供失败分析

---

## 高风险变更升级门槛

### 风险分级规则

- **Low**: 修改 ≤2 个文件、≤50 LOC、无权限/认证/迁移
- **Medium**: 3-5 文件或 50-200 LOC，或涉及核心模块
- **High**: 认证/权限/生产配置/数据迁移/删除/不可逆操作，或 >200 LOC、>8 文件

### 升级动作

- **Low**: Reviewer 通过即可自动 apply
- **Medium**: Reviewer 通过 + 必跑测试；测试缺失需用户确认
- **High**: 必须用户确认后才 apply，且需二次审核

### 默认高风险路径

可在 `project.md` 的 `workflow.risk.high_paths` 中覆盖：
- `auth/`
- `security/`
- `migrations/`
- `db/`
- `infra/`
- `config/`
- `.github/workflows/`
- `.env`

---

## 触发判断

**启用信号（满足任一）:**
- 涉及 3+ 文件修改
- 需多轮交流理解意图
- 预计 10+ 次工具调用
- 新功能开发或架构调整
- 用户提到「规划」「分步」「追踪进度」

**跳过信号:**
- 单文件小改/简单问答
- 3 次工具调用内可完成

> 💡 宁可多用不可少用

---

## 🚨 任务进行中禁止退出

**触发:** 已创建 `request.md` 或 `todolist.md`

**核心规则:**
1. 用户的所有回复都是任务的一部分
2. 用户要求"先测试"等，应在 todolist.md 中记录
3. 只有用户明确说"停止""取消"，才能归档退出

**完成标志:** todolist.md 中所有 Todo 项标记为 `[x]` 或用户明确表示完成

---

## 整体流程

### 传统模式（纯 FlowMem）

```
project.md → 检索理解 → request.md → 澄清需求
→ 🛑确认? → todolist.md → 执行Todo → 归档
```

### 混合模式（FlowMem + ccq-engine，推荐）

```
按需 codebase_retrieval → request.md → 澄清需求
→ 🛑确认? → todolist.md → 执行Todo（再次按需检索）→ 归档
```

**区别**：
- ✅ **无需预先读 project.md**（按需调用 `codebase_retrieval`）
- ✅ **无需债务机制**（代码知识自动索引）
- ✅ **project.md 变为可选**（只记录隐性知识）

---

## 📢 动作输出规范

关键动作必须输出提示，下一个工具调用必须是对应操作：
- 🚀 **FlowMem 已启动** - 触发原因: [信号]
- 📝 **[创建/读取/更新]**: `.agentmem/[文件名]`
- 💡 **知识沉淀** - 补充到: [文件]
- ✅ **Phase X 完成** - 进入下一阶段
- 🔍 **Reviewer 审核** - 结果: [通过/拒绝]

---

## 7 条关键规则

### 规则 1: 上下文管理（混合模式 v2.8）

**前提:**
- **传统模式**: 执行复杂任务前必须先读取 `project.md`
- **混合模式（启用 MCP）**: 按需调用 `codebase_retrieval`，project.md 可选

**刷新顺序:** `todolist.md` → `request.md` → `project.md`（可选）

**何时刷新:**
- 必须：跨模块、连续3+ Todo、遇错、用户变更
- 建议：跨阶段、新代码区域、上下文超50k tokens

### 规则 2: 需求先澄清,确认再执行

1. 创建 `request.md`,记录原始需求
2. AI 提出澄清问题(至少 1 轮)
3. **用户回答后立即更新 `request.md`**
4. 循环直到需求明确
5. **用户确认后先更新状态为「已确认」,再生成 `todolist.md`**

🚨 必须等用户明确回复「确认」「开始」等肯定词才能执行

**执行中需求变更:** 立即更新 `request.md` → 评估影响 → 更新 `todolist.md`

### 规则 3: 智能执行节奏

**默认单步原则:** 执行 1 个 Todo → 更新 todolist.md → 刷新上下文 → 下一个

**批量条件**（需同时满足）：
- 同一模块内连续任务
- 任务无依赖关系
- 非首次接触代码
- 低风险操作

> 💡 拿不准就单步，宁慢勿错

### 规则 4: 存储而非填充
长篇内容存入文件,上下文中只保留路径引用。

### 规则 5: 知识沉淀

#### 传统模式（债务机制）

**债务计数：**
- 每 read_file 一次 = 债务 +1
- 更新 project.md/notes.md = 债务清零
- 🚨 **债务 ≥ 3 时：禁止继续检索或执行，必须先结清债务**

#### 混合模式（启用 MCP 时）

**✅ 债务机制已废除**

**理由**：
- 代码知识通过 `ccq index` 自动索引
- AI 直接调用 `codebase_retrieval` 按需检索
- 无需手动维护 project.md 中的代码结构

### 规则 6: 上下文优化

- 仅追加上下文：新信息始终追加
- 稳定前缀：系统指令 → 项目背景 → 动态内容
- 可逆压缩：存储路径而非删除

### 规则 7: 任务完成后清理

归档到 `history/YYYYMMDD_[文件名]`：任务周期文件（request.md、todolist.md、notes.md）

保留：`project.md` 和 `docs/`

---

## 回滚机制

### 回滚触发方式

| 触发方式 | 说明 |
|----------|------|
| 用户命令 | 输入 `/rollback` 或 "回滚" |
| Reviewer 连续失败 | 同一 todo 重试 2 次仍失败 |
| 用户中途否决 | 用户明确表示方案方向错误 |

### 回滚粒度

- **todo 级回滚（默认）**: 撤销当前 todo 的所有变更，状态改为 pending
- **phase 级回滚**: 回退到上一个用户确认点（Phase 1 或 Phase 2）
- **全量回滚**: 撤销本次任务的所有变更，回到任务开始前状态

---

## 🔒 检查点协议

### 传统模式

AI 执行关键操作前输出检查点：

```
操作: [操作类型]
债务: X/3 → [✅/❌]
判定: [通过/阻塞: 原因]
```

### 混合模式（启用 MCP 时）

检查点简化（无债务检查）：

```
操作: [操作类型]
检索: [是否需要 codebase_retrieval]
判定: [通过/阻塞: 原因]
```

---

## 🔧 审核工具

```bash
flowmem audit          # 运行全部检查
flowmem audit debt     # 仅检查债务（传统模式）
flowmem audit --json   # JSON 输出
```

**检查项**：
- **传统模式（10 项）**: debt, sync, project, size, request-size, todo, active, confirmed, archive, structure
- **混合模式（8 项）**: sync, todo, active, confirmed, archive, structure（移除 debt, project 强制检查）

---

## 🔌 MCP 集成（混合模式）

### 启用步骤

```bash
# 1. 初始化 FlowMem 并启用 MCP
flowmem init --with-mcp

# 2. 安装 ccq-engine
npm install @ccq/engine

# 3. 索引代码库
npx ccq index
```

### AI 使用指引

#### 代码检索 vs 直接读取

| 场景 | 操作 |
|------|------|
| 需要找代码位置 | `codebase_retrieval("关键词")` |
| 需要理解某模块 | `codebase_retrieval("模块名 + 功能描述")` |
| 已知具体路径 | `Read file` |
| 需要修改文件 | `Read file` → `Edit file` |

---

## 反模式对照

### 传统模式

| ❌ 不要 | ✅ 而是 |
|---------|---------|
| 检索 ≥3 文件后不沉淀 | 检索后立即更新 project.md |
| 用户回复后不更新文档 | 立即更新 request.md |
| 输出「💡 知识沉淀」后跳过 | 输出后立即执行对应操作 |
| 高风险任务批量执行 | 单步执行，及时更新 |

### 混合模式（启用 MCP 时）

| ❌ 不要 | ✅ 而是 |
|---------|---------|
| 仍然使用债务机制 | 直接调用 codebase_retrieval |
| 维护完整的 project.md | project.md 只记录隐性知识 |
| 检索前先读 project.md | 直接 codebase_retrieval |
| 用户回复后不更新文档 | 立即更新 request.md（保留） |
| 高风险任务批量执行 | 单步执行，及时更新（保留） |

---

## 参考资源

详细模板、示例和工具见 `.flowmem/` 目录
