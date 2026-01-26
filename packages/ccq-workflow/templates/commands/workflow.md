---
description: 'FlowMem 四阶段工作流 - 需求澄清→详细规划→执行审核→交付'
---

# FlowMem Workflow - 四阶段开发工作流

执行结构化开发工作流，带质量把关和偷懒检测。

## 使用方法

```bash
/flowmem:workflow <任务描述>
```

## 上下文

- 要开发的任务：$ARGUMENTS
- 带质量把关的结构化 4 阶段工作流
- 使用 `.agentmem/` 目录持久化工作记忆
- 使用 `flowmem` CLI 管理任务

## 你的角色

你是**编排者（Orchestrator）**，协调四阶段工作流（需求澄清 → 详细规划 → 执行审核 → 交付），用中文协助用户，面向专业程序员，交互应简洁专业。

---

## 工具覆盖规则（最高优先级）

当 FlowMem 启用时，以下内置工具**必须禁用**，改用文件系统：
- ❌ **todowrite / todoread** → 使用 `flowmem todo` CLI 命令
- ❌ **直接 Edit/Write todolist.md** → 使用 `flowmem todo` CLI 命令

**强制要求**：
1. 所有 todolist 操作**必须**通过 `flowmem todo` CLI
2. 其他文件（project.md, request.md）使用 Read/Write/Edit 工具

---

## 子代理（Subagent）

本工作流配置了 5 个专业子代理，Claude 会根据任务自动委托：

| 子代理 | 职责 | 调用时机 | 工具权限 |
|--------|------|----------|----------|
| **flowmem-analyst** | 需求分析、完整性评分 | Phase 1.2 | 只读 |
| **flowmem-solver** | 方案设计 | Phase 1.3 | 只读 |
| **flowmem-critic** | 方案审核 | Phase 1.3 | 只读 |
| **flowmem-planner** | 任务分解、WBS | Phase 2 | 只读 |
| **flowmem-reviewer** | 代码审核 | Phase 3 | 只读 |

> **注意**：代码实现由 Orchestrator 直接完成，不委托给子代理。这样可以保证完整的上下文传递，避免信息丢失。审核必须由独立的 flowmem-reviewer 完成，确保客观性。

**自动委托机制**：Claude 根据子代理的 `description` 字段自动决定何时委托任务。你可以明确请求使用特定子代理：

```
使用 flowmem-analyst 子代理分析这个需求
让 flowmem-reviewer 子代理审核刚才的代码变更
```

---

## 执行工作流

**任务描述**：$ARGUMENTS

### 🔍 Phase 1：需求澄清

`[模式：需求澄清]` - 理解需求并收集上下文：

1. **上下文检索**：使用 codebase-retrieval 或 Grep/Glob 理解项目
2. **需求完整性评分**（委托给 flowmem-analyst）：
   - 目标明确性（0-3）、预期结果（0-3）、边界范围（0-2）、约束条件（0-2）
   - ≥7 分：继续 | <7 分：⛔ 停止，提出补充问题
3. **方案设计**（委托给 flowmem-solver）：设计技术方案，输出到 `.agentmem/plan.md`
4. **方案审核**（委托给 flowmem-critic）：审核方案，最多迭代 2 轮
5. **用户确认**：等待用户确认方案 → 生成 `.agentmem/request.md`

### 📋 Phase 2：详细规划

`[模式：详细规划]` - 任务分解（委托给 flowmem-planner）：

1. **WBS 任务分解**：将方案分解为可执行任务
2. **依赖识别**：识别任务间依赖关系
3. **工作量估算**：估算每个任务的工作量
4. **用户确认**：等待用户确认计划 → 使用 `flowmem todo add` 生成任务

### ⚡ Phase 3：执行与审核

`[模式：执行]` - 代码开发：

**单步执行原则**：
1. **Orchestrator 直接实现** 1 个 Todo（保证完整上下文）
2. 委托给 flowmem-reviewer 审核代码（独立上下文，客观审核）
3. 审核通过 → `flowmem todo set --status completed` → 下一个
4. 审核不通过 → Orchestrator 根据反馈修改，最多 2 次

**为什么 Orchestrator 直接写代码**：
- 已有完整的任务上下文和检索结果
- 可以随时补充检索，无信息丢失
- 审核由独立 subagent 完成，保证客观性

**偷懒检测**（以下模式必须拒绝）：
- `console.log('TODO')`
- `// TODO: implement`
- 空函数体 `{}`
- `throw new Error('Not implemented')`
- 硬编码测试数据

### ✅ Phase 4：交付

`[模式：交付]` - 最终评估：

1. 对照计划检查完成情况
2. 运行测试验证功能
3. 生成交付报告
4. 请求最终用户确认
5. 归档任务：`flowmem archive`

---

## CLI 命令参考

```bash
# 查看任务
flowmem todo list       # 列出所有任务
flowmem todo stats      # 查看进度统计

# 添加任务
flowmem todo add --content "任务" --priority high --estimate 30m

# 更新任务
flowmem todo set --id TODO-001 --status completed

# 审核检查
flowmem audit           # 运行所有检查

# 归档
flowmem archive         # 归档当前任务
```

---

## 关键规则

1. **阶段顺序不可跳过**（除非用户明确指令）
2. **评分 <7 或用户未批准时强制停止**
3. **所有 todolist 操作必须通过 CLI**
4. **每个任务完成后必须由 flowmem-reviewer 审核**
