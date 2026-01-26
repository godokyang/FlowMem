---
meta:
  title: "[功能名称]"
  created: "{timestamp}"
  updated: "{timestamp}"
  request_ref: ".agentmem/request.md"
  plan_ref: ".agentmem/plan.md"
  total_points: 0
  progress: 0%
todos:
  - id: "TODO-001"
    content: "任务描述"
    status: "pending"
    priority: "high"
    points: 2
    depends_on: []
    phase: "Phase 1: 基础设施"
    acceptance:
      - "验收条件1"
      - "验收条件2"
    files:
      - "src/path/to/file.ts"
    log: ""
---

# 任务清单: [功能名称]

## 进度

```
[░░░░░░░░░░░░░░░░░░░░] 0%
总任务: 0 | 已完成: 0 (0%)
```

## 执行顺序

### Phase 1: 基础设施
1. [ ] TODO-001 - [任务描述] (2点)

### Phase 2: 核心逻辑
2. [ ] TODO-002 - [任务描述] (1点) ← 依赖 TODO-001

### Phase 3: 集成测试
3. [ ] TODO-003 ∥ TODO-004 - 可并行执行

## 依赖关系图

```
TODO-001
    ↓
TODO-002 → TODO-003
    ↓
TODO-004
```

## 状态说明

- `[ ]` pending - 未开始
- `[/]` in_progress - 进行中（同时只能有 1 个）
- `[x]` completed - 已完成
- `[-]` cancelled - 已取消

## 优先级说明

- 🔴 high - 紧急且重要
- 🟡 medium - 重要但不紧急
- 🟢 low - 可以延后

## 风险提示

- [高风险任务及原因]
