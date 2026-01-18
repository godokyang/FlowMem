# Claude Code 使用指南

## 为什么 Claude Code 需要特殊配置？

Claude Code 使用 **Skill 系统**，需要用户明确激活 Skill 才能生效。

## 安装步骤

### 方式 1：使用 CLI（推荐）

```bash
# 安装到当前项目
flowmem init --adapter claude-code

# 这会创建 .claude/skills/context-memory-system/
```

### 方式 2：全局安装

```bash
# 复制到用户目录
cp -r .claude/skills/context-memory-system ~/.claude/skills/

# 所有项目都可使用
```

## 激活 Skill

### 方法 1：对话中手动激活（每次对话）

在 Claude Code 对话中输入：

```
/skill context-memory-system
```

或者

```
请使用 context-memory-system skill 来管理这个任务
```

### 方法 2：项目设置中启用（推荐）

1. 打开 Claude Code
2. 进入项目设置
3. 找到 "Skills" 部分
4. 启用 `context-memory-system`
5. 保存设置

启用后，Claude Code 会在每次对话开始时自动加载这个 Skill。

## 验证 Skill 是否生效

启动新对话后，询问 Claude：

```
你有使用 FlowMem 上下文记忆系统吗？
```

Claude 应该回答类似：

```
是的，我已加载 context-memory-system skill。
我会遵循以下规则：
- 三秒检查（检索、文件创建、用户回复）
- 使用 .agentmem/ 目录管理工作记忆
- 债务机制（检索 ≥3 文件后立即沉淀）
...
```

## Skill 不生效的排查

### 1. 检查 Skill 文件是否存在

```bash
# 项目级
ls .claude/skills/context-memory-system/SKILL.md

# 全局级
ls ~/.claude/skills/context-memory-system/SKILL.md
```

### 2. 检查 SKILL.md frontmatter

```bash
head -5 .claude/skills/context-memory-system/SKILL.md
```

应该看到：

```yaml
---
name: context-memory-system
description: FlowMem 上下文记忆系统...
autorun: true
---
```

### 3. 重启 Claude Code

有时需要重启 Claude Code 才能加载新的 Skill。

### 4. 查看 Claude Code 日志

检查是否有 Skill 加载错误。

## 常见问题

### Q: 为什么 Claude Code 不像 Cursor 那样自动读取规则文件？

A: Claude Code 使用不同的架构：
- **Cursor/Windsurf/Cline**: 直接读取 `.cursorrules` 等文件（自动）
- **Claude Code**: 使用 Skill 系统（需要激活）

### Q: 可以同时使用项目级和全局级 Skill 吗？

A: 可以。项目级优先级更高。

### Q: autorun: true 是什么意思？

A: `autorun: true` 告诉 Claude Code 在检测到复杂任务时自动激活这个 Skill。但首次使用仍需手动激活或在项目设置中启用。

## 推荐工作流

1. **全局安装 Skill**（一次性）
   ```bash
   cp -r ~/.claude/skills/context-memory-system
   ```

2. **在每个项目中激活**
   - 项目设置 → Skills → 启用 context-memory-system

3. **开始工作**
   - Claude 会自动遵循 FlowMem 规则
   - 创建 .agentmem/ 目录
   - 管理 project.md, request.md, todolist.md

## 与其他编辑器的对比

| 编辑器 | 规则加载方式 | 需要手动激活？ |
|--------|--------------|----------------|
| Cursor | `.cursorrules` | 否（自动） |
| Windsurf | `.windsurfrules` | 否（自动） |
| Cline | `.clinerules` | 否（自动） |
| **Claude Code** | **Skill 系统** | **是（需手动或设置）** |

---

**总结**：Claude Code 需要额外一步激活，但一旦启用，功能与其他编辑器相同。
