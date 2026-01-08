# 任务清单：集成 Stripe 支付

> **关联需求**：[request.md](request.md)

## 待办事项

### Phase 1: 基础设施
- [x] 安装 stripe 依赖包 (`npm install @stripe/stripe-js @stripe/react-stripe-js`)
- [x] 配置环境变量 `STRIPE_SECRET_KEY` 和 `NEXT_PUBLIC_STRIPE_KEY`
- [x] 初始化 Stripe 客户端实例 `lib/stripe.ts`

### Phase 2: 后端 API 开发
- [ ] 创建 API `/api/create-payment-intent`
    - [ ] 验证用户登录态
    - [ ] 计算订单金额（严禁前端传金额）
    - [ ] 调用 Stripe SDK 创建 PaymentIntent
- [ ] 创建 Webhook 端点 `/api/webhooks/stripe`
    - [ ] 验证 Webhook 签名 (Security)
    - [ ] 处理 `payment_intent.succeeded` 事件
    - [ ] 更新数据库订单状态

### Phase 3: 前端开发
- [ ] 创建支付表单组件 `components/CheckoutForm.tsx`
    - [ ] 集成 `<PaymentElement />`
    - [ ] 处理提交逻辑 (`stripe.confirmPayment`)
- [ ] 集成到订单页 `pages/order/[id].tsx`

### Phase 4: 验证
- [ ] 测试正常支付流程（使用 Test Cards）
- [ ] 测试 3D Secure 验证流程
- [ ] 测试从 Webhook 更新订单状态
- [ ] 测试支付失败 UI 反馈

## 执行日志
- **2026-01-08 14:30**: 完成依赖安装和环境变量配置。遇到类型报错，通过安装 `@types/stripe` 解决。
- **2026-01-08 14:45**: Stripe 客户端单例模式封装完成。

## 遇到的问题
- [ ] 暂无
