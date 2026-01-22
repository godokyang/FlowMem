---
name: context-memory-system
description: FlowMem 上下文记忆系统。使用持久化 Markdown 文件管理 AI 工作记忆，在开始复杂任务、多文件修改时自动激活。
autorun: true
---

# 上下文记忆系统规则 (v2.0)

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
> **v2.0 新增**: 支持 MCP 混合模式（可选启用 ccq-engine 自动索引）

---

## 核心文件

| 文件 | 定位 | 生命周期 |
|------|------|----------|
| `.agentmem/project.md` | 项目整体描述 | 长期维护 |
| `.agentmem/request.md` | 当前需求澄清 | 任务周期 |
| `.agentmem/todolist.md` | 任务清单(YAML格式) | 任务周期 |
| `.agentmem/task_logs/` | 执行日志/总结/问题 | 任务周期 |
| `.agentmem/notes.md` | 研究笔记 | 按需使用 |
| `.agentmem/docs/` | 详细文档目录 | 长期积累 |
| `.agentmem/request_detail/` | 需求对话详情 | 任务周期 |
| `.agentmem/history/` | 历史归档 | 永久保留 |

**🔴 project.md vs request.md 边界:**
- 下次任务还有用？→ `project.md`
- 本次需求边界/确认细节？→ `request.md`

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
todos:
  - id: "TODO-001"
    content: "任务描述"
    status: "pending"           # pending/in_progress/completed/cancelled
    priority: "high"             # high/medium/low
    estimate: "30m"              # 5m/1h/2d 标准化格式
    dependencies: ["TODO-002"]   # 依赖任务 ID
    phase: "阶段名称"
    log: "task_logs/001.md"      # 可选
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

---

## 7 条关键规则

### 规则 1: 上下文管理（混合模式 v2.0）

**前提:** 
- **传统模式**: 执行复杂任务前必须先读取 `project.md`
- **混合模式（启用 MCP）**: 按需调用 `codebase_retrieval`，project.md 可选

**刷新顺序:** `todolist.md` → `request.md` → `project.md`（可选）

**何时刷新:**
- 必须：跨模块、连续3+ Todo、遇错、用户变更
- 建议：跨阶段、新代码区域、上下文超50k tokens

**刷新流程:**

**传统模式**：
1. 读取当前 Todo
2. 读取需求目标
3. 读取项目背景
4. 检索代码/文档（如需要）
5. 立即补充新知识到文档

**混合模式（启用 MCP 时）**：
1. 读取当前 Todo
2. 读取需求目标
3. 调用 `codebase_retrieval("查询关键词")` 检索相关代码
4. （可选）读取 project.md 中的隐性知识
5. 无需手动沉淀（代码已自动索引）

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

**沉淀去哪：**
- 架构/API/模块知识 → `project.md`
- 需求边界/确认细节 → `request.md`
- 临时发现/调试信息 → `notes.md`

**防膨胀：**
- `project.md` 超过 300 行 → 迁移详细内容到 `docs/`
- 单模块超过 50 行 → 拆分为独立文档

#### 混合模式（启用 MCP 时）

**✅ 债务机制已废除**

**理由**：
- 代码知识通过 `ccq index` 自动索引
- AI 直接调用 `codebase_retrieval` 按需检索
- 无需手动维护 project.md 中的代码结构

**project.md 新定位**（可选，约 50 行）：
- ✅ **保留**: 隐性知识（架构决策、历史坑点、特殊约定）
- ❌ **删除**: 代码结构、模块列表、API 文档（自动索引）

**示例 project.md（混合模式）**：
```markdown
# [项目名称]

## 一句话描述
[这个项目是什么、为谁解决什么问题]

## 技术栈
- 语言: TypeScript
- 框架: Next.js

## 🔗 代码检索
使用 ccq-engine 自动索引，AI 直接调用 codebase_retrieval。

## ⚠️ 必读注意事项
- [坑点1: 特殊约定]
- [坑点2: 不在代码里的重要信息]
```

### 规则 6: 上下文优化

- 仅追加上下文：新信息始终追加
- 稳定前缀：系统指令 → 项目背景 → 动态内容
- 可逆压缩：存储路径而非删除

### 规则 7: 任务完成后清理

归档到 `history/YYYYMMDD_[文件名]`：任务周期文件（request.md、todolist.md、notes.md）

保留：`project.md` 和 `docs/`

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

#### 示例

```
用户: "帮我修改登录逻辑"

AI 操作:
1. codebase_retrieval("登录 login authentication") 
   → 获取相关代码 chunks
2. 根据 chunks 确定具体文件路径
3. Read file 读取完整文件
4. Edit file 修改
```

### MCP 工具参考

启用 MCP 后，AI 可以调用以下工具：

```typescript
// 语义检索
codebase_retrieval({
  query: "用户认证逻辑",
  topK: 10
})

// 问答
codebase_ask({
  question: "这个项目如何处理错误？"
})

// 状态查询
codebase_status()
```

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
