---
meta:
  title: "集成 Stripe 支付"
  created: "2024-01-15T10:00:00Z"
  updated: "2024-01-15T14:30:00Z"
  request: ".agentmem/request.md"
todos:
  - id: "TODO-001"
    content: "安装 stripe 依赖包"
    status: "completed"
    priority: "high"
    estimate: "5m"
    dependencies: []
    phase: "Phase 1: 基础设施"
    log: "task_logs/001-install-deps.md"
  - id: "TODO-002"
    content: "配置环境变量 STRIPE_SECRET_KEY 和 NEXT_PUBLIC_STRIPE_KEY"
    status: "completed"
    priority: "high"
    estimate: "10m"
    dependencies: ["TODO-001"]
    phase: "Phase 1: 基础设施"
  - id: "TODO-003"
    content: "初始化 Stripe 客户端实例 lib/stripe.ts"
    status: "completed"
    priority: "high"
    estimate: "15m"
    dependencies: ["TODO-002"]
    phase: "Phase 1: 基础设施"
  - id: "TODO-004"
    content: "创建 API /api/create-payment-intent"
    status: "in_progress"
    priority: "high"
    estimate: "1h"
    dependencies: ["TODO-003"]
    phase: "Phase 2: 后端 API 开发"
  - id: "TODO-005"
    content: "验证用户登录态"
    status: "pending"
    priority: "high"
    estimate: "20m"
    dependencies: ["TODO-004"]
    phase: "Phase 2: 后端 API 开发"
  - id: "TODO-006"
    content: "计算订单金额（严禁前端传金额）"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: ["TODO-004"]
    phase: "Phase 2: 后端 API 开发"
  - id: "TODO-007"
    content: "调用 Stripe SDK 创建 PaymentIntent"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: ["TODO-005", "TODO-006"]
    phase: "Phase 2: 后端 API 开发"
---

# 任务清单: 集成 Stripe 支付

> **关联需求**: [request.md](.agentmem/request.md)

## 📊 进度统计
```
总任务: 7
已完成: 3 (43%)
进行中: 1 (14%)
待开始: 3 (43%)
已取消: 0 (0%)

[████████░░░░░░░░░░░░] 43%
```

**预计总时间**: 3h 50m

---

## 当前任务
- [/] **TODO-004**: 创建 API /api/create-payment-intent (进行中)

---

## 📋 任务列表

### Phase 1: 基础设施

- [x] **TODO-001**: 安装 stripe 依赖包
  - 优先级: 🔴 High
  - 预计: 5m
  - 日志: [task_logs/001-install-deps.md](task_logs/001-install-deps.md)

- [x] **TODO-002**: 配置环境变量 STRIPE_SECRET_KEY 和 NEXT_PUBLIC_STRIPE_KEY
  - 优先级: 🔴 High
  - 预计: 10m
  - 依赖: TODO-001

- [x] **TODO-003**: 初始化 Stripe 客户端实例 lib/stripe.ts
  - 优先级: 🔴 High
  - 预计: 15m
  - 依赖: TODO-002

### Phase 2: 后端 API 开发

- [/] **TODO-004**: 创建 API /api/create-payment-intent
  - 优先级: 🔴 High
  - 预计: 1h
  - 依赖: TODO-003

- [ ] **TODO-005**: 验证用户登录态
  - 优先级: 🔴 High
  - 预计: 20m
  - 依赖: TODO-004

- [ ] **TODO-006**: 计算订单金额（严禁前端传金额）
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-004

- [ ] **TODO-007**: 调用 Stripe SDK 创建 PaymentIntent
  - 优先级: 🔴 High
  - 预计: 30m
  - 依赖: TODO-005, TODO-006

---

## 💡 注意事项

1. **YAML Frontmatter 必须完整**：不要删除 `---` 分隔符
2. **ID 必须唯一**：每个 todo 的 id 不能重复
3. **依赖关系必须有效**：dependencies 中的 ID 必须存在
4. **时间格式必须标准化**：使用 5m/1h/2d 格式
5. **进度条自动更新**：每次修改任务状态后自动刷新
