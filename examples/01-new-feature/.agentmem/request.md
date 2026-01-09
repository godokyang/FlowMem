# 需求澄清：集成 Stripe 支付

> **状态**：✅ 已确认
> **关联任务**：[Project - 支付系统集成](../project.md)

## 原始需求 (User)
我们需要在这个电商 demo 中接一下 Stripe 支付，支持信用卡付款就行。

---

## 💡 澄清对话记录

### Round 1: 范围确认 (AI)
1. **支持哪些卡种？** 仅 Visa/MasterCard 还是需要支持 AMEX/JCB？
2. **是否需要退款功能？** MVP 版本是否包含退款后台？
3. **Webhooks？**是否需要处理支付成功的异步回调？

### Round 1: 用户回复 (User)
1. 只需要 Visa 和 MasterCard。
2. 退款先不做，第一版只管收钱。
3. Webhooks 肯定要，不然不知道支付结果。

### Round 2: 技术细节 (AI)
1. **前端组件**：是用 Stripe Elements (官方 UI) 还是自定义表单？建议用 Elements 比较快。
2. **安全要求**：是否需要开启 3D Secure 验证？

### Round 2: 用户回复 (User)
1. 用 Stripe Elements。
2. 3D Secure 要开启，防止欺诈。

---

## ✅ 最终需求总结

### 核心功能
1. **创建支付 Intent**：后端 API `/api/create-payment-intent`
2. **前端收银台**：集成 Stripe Elements (React)，支持 Visa/MasterCard
3. **Webhook 处理**：监听 `payment_intent.succeeded` 事件，更新订单状态
4. **安全验证**：强制开启 3D Secure

### 验收标准
- [ ] 用户能在前端输入卡号并点击支付
- [ ] 支付成功后自动跳转成功页
- [ ] 数据库订单状态变为 `PAID`
- [ ] 失败或拒绝时前端有错误提示

### 技术决策
- 前端库：`@stripe/react-stripe-js`
- 后端库：`stripe` (Node.js SDK)
- 货币：USD (固定)
