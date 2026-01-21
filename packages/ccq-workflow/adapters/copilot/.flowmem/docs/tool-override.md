# FlowMem 工具覆盖说明

## 问题背景

许多 AI 编辑器（如 Claude Code, Cursor, Windsurf）都有内置的任务管理工具（如 `todowrite`, `todoread`），这些工具与 FlowMem 的文件系统管理方式产生冲突。

## 冲突场景

### Claude Code (Sisyphus Agent)
- **内置工具**: `todowrite`, `todoread`
- **FlowMem 要求**: 使用 `.agentmem/todolist.md` 文件
- **冲突**: AI 优先使用熟悉的内置工具，忽略文件系统

### 其他编辑器
类似的内置工具可能包括：
- Task management tools
- Note-taking tools
- Memory/context tools

## 解决方案

### v2 修复（已实现）

在规则文件开头添加**明确的工具覆盖规则**（最高优先级）：

```markdown
> 🚨 **工具覆盖规则（最高优先级）**
>
> 当 FlowMem 启用时，以下内置工具**必须禁用**，改用文件系统：
> - ❌ **todowrite / todoread** → 使用 `.agentmem/todolist.md` 文件（Read/Write 工具）
> - ❌ **task / background_task 的 TODO 功能** → 使用 `.agentmem/todolist.md` 文件
> - ❌ **AI 内置记忆/上下文管理** → 使用 `.agentmem/project.md` 等持久化文件
>
> **强制要求**：所有任务管理必须通过文件系统（Read/Write/Edit），不得使用内置 todo 工具。
```

### 为什么这样设计

1. **明确性**: 放在文件开头，最高优先级
2. **强制性**: 使用"必须禁用"、"强制要求"等强制性语言
3. **具体性**: 明确列出冲突的工具名称
4. **替代方案**: 告诉 AI 应该使用什么（Read/Write 工具操作文件）

## 验证方法

### 测试 AI 是否遵守规则

在对话中问：

```
我要开始一个新任务，你会使用什么工具来管理任务清单？
```

**正确回答**（使用文件系统）：
```
我会使用文件系统来管理任务：
1. 创建 .agentmem/todolist.md 文件（使用 Write 工具）
2. 使用 Edit 工具更新任务状态
3. 使用 Read 工具读取当前任务

不会使用内置的 todowrite/todoread 工具。
```

**错误回答**（使用内置工具）：
```
我会使用 todowrite 工具创建任务清单...
```

### 如果 AI 仍然使用内置工具

**方法 1**: 明确提醒
```
请注意 FlowMem 规则：禁止使用 todowrite，必须使用 .agentmem/todolist.md 文件
```

**方法 2**: 检查规则文件
```bash
# 确认规则文件已包含工具覆盖规则
head -20 .cursorrules
# 或
head -20 .claude/skills/context-memory-system/SKILL.md
```

**方法 3**: 重新初始化
```bash
flowmem init --adapter claude-code --force
```

## 技术细节

### 优先级层级

```
1. FlowMem 工具覆盖规则（新增，最高优先级）
   ↓
2. 三秒检查
   ↓
3. 7 条关键规则
   ↓
4. 系统级内置工具（被覆盖）
```

### 受影响的编辑器

| 编辑器 | 内置工具 | 状态 |
|--------|----------|------|
| Claude Code | todowrite, todoread | ✅ 已添加覆盖规则 |
| Cursor | 可能有内置 task 工具 | ✅ 已添加覆盖规则 |
| Windsurf | 未知 | ✅ 已添加覆盖规则 |
| 其他 | 待发现 | ✅ 通用覆盖规则 |

## 更新日志

### v2.0.1（当前修复）
- ✅ 添加工具覆盖规则到 common-rules.md 开头
- ✅ 重新生成所有 7 个适配器
- ✅ 更新行数：188 → 197 行（+9 行工具覆盖规则）
- ✅ 创建本说明文档

---

**感谢用户发现此问题！这是一个关键的系统级冲突，现在已经修复。**
