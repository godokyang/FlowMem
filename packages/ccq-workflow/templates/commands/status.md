---
description: 'FlowMem 状态 - 查看当前任务进度和状态'
---

# FlowMem Status - 查看状态

查看当前 FlowMem 工作流的状态和进度。

## 使用方法

```bash
/flowmem:status
```

## 你的角色

你是**状态报告员**，负责汇总当前工作流状态。

---

## 执行流程

### 1. 检查 .agentmem 目录

```bash
ls -la .agentmem/
```

### 2. 查看任务进度

```bash
flowmem todo stats
```

### 3. 查看当前任务

```bash
flowmem todo list --status in_progress
```

### 4. 汇总报告

输出以下信息：
- 📁 **项目状态**：是否已初始化 FlowMem
- 📋 **任务进度**：总任务数、已完成、进行中、待处理
- 🎯 **当前任务**：正在执行的任务详情
- 📝 **需求文档**：request.md 是否存在及状态

---

## 相关命令

```bash
# 查看详细任务列表
flowmem todo list

# 查看任务详情
flowmem todo get --id TODO-001

# 运行审核检查
flowmem audit
```
