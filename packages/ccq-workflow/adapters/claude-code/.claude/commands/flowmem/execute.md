---
description: 'FlowMem 执行 - 根据已有计划执行任务'
---

# FlowMem Execute - 执行计划

根据 `.agentmem/todolist.md` 中的任务计划执行开发。

## 使用方法

```bash
/flowmem:execute [任务ID]
```

## 上下文

- 任务 ID（可选）：$ARGUMENTS
- 如果不指定，从第一个 pending 任务开始
- 需要先有 `.agentmem/todolist.md`

## 你的角色

你是**编排者（Orchestrator）**，负责协调 flowmem-coder 和 flowmem-reviewer 完成任务执行。

---

## 子代理（Subagent）

执行阶段使用以下子代理：

| 子代理 | 职责 | 工具权限 |
|--------|------|----------|
| **flowmem-coder** | 代码实现 | 读写 |
| **flowmem-reviewer** | 代码审核 | 只读 |

Claude 会根据任务自动委托给相应的子代理。你也可以明确请求：

```
使用 flowmem-coder 子代理实现 TODO-001
让 flowmem-reviewer 子代理审核刚才的代码变更
```

---

## 前置检查

1. 检查 `.agentmem/todolist.md` 是否存在
2. 如果不存在，提示用户先运行 `/flowmem:plan` 或 `/flowmem:workflow`

---

## 执行流程

### ⚡ 单步执行

对于每个任务：

1. **读取任务**：`flowmem todo get --id <ID>`
2. **执行任务**（委托给 flowmem-coder）：按任务描述和验收条件实现
3. **自动审核**（委托给 flowmem-reviewer）：
   - ✅ 代码有实际逻辑
   - ✅ 无语法错误
   - ✅ 满足验收条件
4. **更新状态**：`flowmem todo set --id <ID> --status completed`
5. **下一个任务**

### 🔍 偷懒检测

以下模式**必须拒绝**：
- `console.log('TODO')`
- `// TODO: implement`
- 空函数体 `{}`
- `throw new Error('Not implemented')`

### 🔄 重试策略

审核不通过时：
1. 第 1 次重试：根据反馈修改
2. 第 2 次重试：重新检索上下文后修改
3. 仍失败：升级到用户

---

## CLI 命令

```bash
# 查看当前任务
flowmem todo list --status in_progress

# 更新任务状态
flowmem todo set --id TODO-001 --status completed

# 查看进度
flowmem todo stats
```

---

## 完成后

所有任务完成后：
1. 运行测试验证
2. 生成交付报告
3. 归档：`flowmem archive`
