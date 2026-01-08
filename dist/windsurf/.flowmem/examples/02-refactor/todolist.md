# 任务清单：重构 Auth 逻辑到 Service 层

> **关联需求**：将散落在 `AuthController` 中的业务逻辑抽离到 `AuthService`，统一异常处理。
> **相关文档**：详见 `docs/architecture.md` 中的 [Service Layer 规范](../docs/architecture.md#service-layer)

## 待办事项

### Phase 1: 准备工作
- [x] 创建 `services/AuthService.ts` 接口定义
- [x] 创建 `services/impl/AuthServiceImpl.ts` 基础类
- [x] 刷新上下文：确认 `AuthController` 当前所有依赖项

### Phase 2: 逻辑迁移 (按方法)
- [x] 迁移 `login` 方法
    - [x] 提取密码校验逻辑
    - [x] 提取 JWT 生成逻辑
    - [x] 单元测试 `AuthService.login`
- [/] 迁移 `register` 方法 (Context: 154 lines)
    - [x] 提取数据验证逻辑
    - [ ] 提取用户创建逻辑
    - [ ] 提取发送欢迎邮件逻辑
    - [ ] 单元测试 `AuthService.register`
- [ ] 迁移 `resetPassword` 方法

### Phase 3: Controller 清理
- [ ] 替换 `AuthController` 中的逻辑为 Service 调用
- [ ] 统一使用 `GlobalExceptionHandler` 处理 Service 抛出的自定义异常
- [ ] 删除 Controller 中不再需要的私有方法

### Phase 4: 验证
- [ ] 运行所有 Auth 相关集成测试
- [ ] 手动测试完整的注册登录流程

## 执行日志
- **2026-01-08 10:00**: `login` 方法迁移完成，发现原代码中 JWT Secret 是硬编码的，已提取到 `.env`。
- **2026-01-08 10:30**: `register` 方法迁移中。注意：发送邮件目前是同步调用，不仅慢而且可能阻塞，**已在这个 Todo 中标记**，作为后续优化的技术债务。

## 遇到的问题
- [x] **循环依赖**：`AuthService` 依赖 `UserService`，但 `UserService` 又引用了 `AuthUtils`。
    - **解决方案**：将工具方法抽离到纯函数 `utils/password.ts`，打破依赖链。
