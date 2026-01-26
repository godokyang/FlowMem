---
created_at: "{timestamp}"
created_by: "Context Curator"
type: "context"
task: "[任务简述]"
token_saved: "0 tokens (0%)"
files_processed: 0
files_included: 0
---

# 上下文摘要

**生成时间**: {timestamp}
**任务**: [任务简述]
**Token 节省**: 约 0 tokens (0%)

## 关键文件

| 文件 | 行号 | 相关性 | 摘要 |
|------|------|--------|------|
| src/xxx.ts | 1-50 | 高 | [摘要] |
| src/yyy.ts | 10-30 | 中 | [摘要] |

## 关键代码片段

### src/xxx.ts:1-20

```typescript
// 关键代码摘录
```

### src/yyy.ts:10-30

```typescript
// 关键代码摘录
```

## 依赖关系

```
src/xxx.ts
    ├── src/yyy.ts (调用 xxx)
    └── src/zzz.ts (使用 XXX 类型)
```

## 类型定义

```typescript
// 关键类型定义
interface XXX {
  // ...
}
```

## 注意事项

- [需要注意的坑点或约定]
- [与任务相关的特殊处理]

## 过滤的文件

以下文件被评估为低相关性，已过滤：

| 文件 | 原因 |
|------|------|
| src/aaa.ts | 与任务无关 |
| src/bbb.ts | 重复模式 |
