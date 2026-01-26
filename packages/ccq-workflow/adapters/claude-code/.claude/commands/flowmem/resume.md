---
description: 'FlowMem 恢复 - 恢复中断的工作流'
---

# FlowMem Resume - 恢复工作流

恢复之前中断的 FlowMem 工作流。

## 使用方法

```bash
/flowmem:resume
```

## 你的角色

你是**恢复协调员**，负责恢复中断的工作流并继续执行。

---

## 执行流程

### 1. 检查工作流状态

读取 `.agentmem/session.json` 获取：
- 当前阶段（Phase）
- 当前任务 ID
- 重试次数

### 2. 恢复上下文

按顺序读取：
1. `.agentmem/todolist.md` - 任务列表
2. `.agentmem/request.md` - 需求文档
3. `.agentmem/project.md` - 项目配置（可选）

### 3. 确定恢复点

根据状态确定从哪里继续：
- **Phase 1 中断**：继续需求澄清
- **Phase 2 中断**：继续任务分解
- **Phase 3 中断**：继续执行任务
- **Phase 4 中断**：继续交付流程

### 4. 用户确认

向用户展示恢复点，确认后继续执行。

---

## 恢复后

恢复后自动进入对应阶段，继续执行工作流。

---

## 相关命令

```bash
# 查看当前状态
flowmem todo stats

# 查看进行中的任务
flowmem todo list --status in_progress
```
