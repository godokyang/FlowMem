---
created_at: "{timestamp}"
rollback_id: "{rollback_id}"
level: "todo" | "phase" | "full"
trigger: "user_command" | "reviewer_failed" | "user_rejected"
---

# 回滚记录 - {rollback_id}

## 回滚信息

- **时间**: {timestamp}
- **级别**: todo / phase / full
- **触发方式**: 用户命令 / Reviewer 失败 / 用户否决

## 回滚原因

[详细描述为什么需要回滚]

## 回滚范围

### 文件变更

| 文件 | 操作 | 原因 |
|------|------|------|
| src/xxx.ts | 恢复 | [原因] |
| src/yyy.ts | 恢复 | [原因] |

### 状态变更

| Todo ID | 原状态 | 新状态 |
|---------|--------|--------|
| TODO-001 | completed | pending |
| TODO-002 | in_progress | pending |

## 回滚执行

### 执行命令

```bash
# Git 操作
git checkout HEAD~1 -- src/xxx.ts
git checkout HEAD~1 -- src/yyy.ts

# 或使用 stash
git stash
```

### 执行结果

- [x] 文件已恢复
- [x] todolist.md 状态已更新
- [x] 日志已记录

## 后续建议

基于回滚原因，建议：

1. [改进建议1]
2. [改进建议2]

## 恢复执行点

- **todo 级回滚**: 从 {todo_id} 重新开始
- **phase 级回滚**: 回到 Phase {phase_id} 确认点
- **全量回滚**: 等待新指令
