---
description: 'FlowMem 审核 - 检查代码质量和偷懒代码'
---

# FlowMem Audit - 代码审核

运行代码质量检查，检测偷懒代码和技术债务。

## 使用方法

```bash
/flowmem:audit [目录]
```

## 上下文

- 检查目录（可选）：$ARGUMENTS
- 默认检查当前目录

## 你的角色

你是**代码审核员**，负责检查代码质量和偷懒代码。

---

## 执行流程

### 1. 运行 CLI 审核

```bash
# 运行所有检查
flowmem audit

# 检查偷懒代码
flowmem audit --lazy

# 检查指定目录
flowmem audit lazy $ARGUMENTS
```

### 2. 偷懒代码检测

检测以下模式：
- `console.log('TODO')`
- `// TODO: implement`
- `// FIXME`
- 空函数体 `{}`
- `throw new Error('Not implemented')`
- 硬编码测试数据

### 3. 技术债务检查

```bash
flowmem audit debt $ARGUMENTS
```

### 4. 输出报告

汇总检查结果：
- ✅ 通过的检查项
- ❌ 失败的检查项
- 📝 建议修复的问题

---

## 相关命令

```bash
# 检查任务完成情况
flowmem audit --todo

# JSON 格式输出
flowmem audit --json

# 检查依赖关系
flowmem audit dependency-check
```
