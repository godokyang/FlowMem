---
meta:
  title: "[任务标题]"
  created: "[创建时间 ISO 8601]"
  updated: "[更新时间 ISO 8601]"
  version: "v1.0.0"
  request: ".agentmem/request.md"
todos:
  - id: "TODO-001"
    content: "[任务描述]"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: []
    phase: "[阶段名称]"
    log: "task_logs/001-task-name.md"
  
  - id: "TODO-002"
    content: "[任务描述]"
    status: "pending"
    priority: "medium"
    estimate: "1h"
    dependencies: ["TODO-001"]
    phase: "[阶段名称]"
    log: ""
---

# 任务清单: [任务标题]

> **关联需求**: [request.md](request.md)
> **项目**: [项目名称]

## 📊 进度统计
```
总任务: 2
已完成: 0 (0%)
进行中: 0 (0%)
待开始: 2 (100%)
已取消: 0 (0%)

[░░░░░░░░░░░░░░░░░░░░] 0%
```

**预计总时间**: 1h 30m

---

## 当前任务
暂无进行中的任务

---

## 📋 任务列表

### [阶段名称]

- [ ] **TODO-001**: [任务描述]
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: 无
  - 日志: [task_logs/001-task-name.md](task_logs/001-task-name.md)

- [ ] **TODO-002**: [任务描述]
  - 优先级: 🟡 Medium
  - 预计: 1h
  - 依赖: TODO-001

---

## 📝 使用说明

### 状态标记
- `[ ]` 未开始 (pending)
- `[/]` 正在进行 (in_progress)
- `[x]` 已完成 (completed)
- `[-]` 已取消 (cancelled)

### 优先级标记
- 🔴 High (high) - 紧急且重要
- 🟡 Medium (medium) - 重要但不紧急
- 🟢 Low (low) - 可以延后

### 时间格式
- `5m` - 5 分钟
- `30m` - 30 分钟
- `1h` - 1 小时
- `2h` - 2 小时
- `1d` - 1 天
- `2d` - 2 天

### CLI 命令
```bash
# 查看所有任务
flowmem todo list

# 查看进度统计
flowmem todo stats

# 添加新任务
flowmem todo add

# 更新任务状态
flowmem todo update TODO-001 --status in_progress

# 运行审核检查
flowmem audit
flowmem audit dependency-check
```

---

## 💡 注意事项

1. **YAML Frontmatter 必须完整**：不要删除 `---` 分隔符
2. **ID 必须唯一**：每个 todo 的 id 不能重复
3. **依赖关系必须有效**：dependencies 中的 ID 必须存在
4. **时间格式必须标准化**：使用 5m/1h/2d 格式
5. **进度条自动更新**：每次修改任务状态后自动刷新

---

## 🔗 相关资源

- **需求文档**: [request.md](request.md)
- **项目描述**: [project.md](project.md)
- **任务日志**: [task_logs/](task_logs/)
