# 编码规范文档模板

> 记录项目的编码约定和开发规范

---

## 代码风格

### 格式化工具

| 工具 | 配置文件 | 说明 |
|------|----------|------|
| ESLint | `.eslintrc.js` | 代码检查 |
| Prettier | `.prettierrc` | 代码格式化 |
| EditorConfig | `.editorconfig` | 编辑器配置 |

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量 | camelCase | `userName` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 函数 | camelCase | `getUserById()` |
| 类 | PascalCase | `UserService` |
| 文件 | kebab-case | `user-service.ts` |
| 组件 | PascalCase | `UserProfile.tsx` |

---

## Git 规范

### 分支策略

```
main          # 生产环境
├── develop   # 开发环境
│   ├── feature/xxx   # 功能分支
│   ├── bugfix/xxx    # 修复分支
│   └── hotfix/xxx    # 紧急修复
```

### Commit 规范

格式：`<type>(<scope>): <subject>`

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 |
| docs | 文档 |
| style | 格式 |
| refactor | 重构 |
| test | 测试 |
| chore | 杂项 |

示例：`feat(user): 添加用户注册功能`

---

## 项目结构

```
src/
├── api/          # API 路由定义
├── components/   # 可复用组件
├── hooks/        # 自定义 Hooks
├── services/     # 业务逻辑
├── utils/        # 工具函数
├── types/        # 类型定义
└── config/       # 配置文件
```

---

## 注释规范

### 函数注释

```typescript
/**
 * 获取用户信息
 * @param userId - 用户 ID
 * @returns 用户信息对象
 * @throws {NotFoundError} 用户不存在时抛出
 */
function getUserById(userId: string): User {
  // ...
}
```

### TODO 注释

```typescript
// TODO: 待实现的功能
// FIXME: 需要修复的问题
// HACK: 临时解决方案，需要优化
// NOTE: 重要说明
```

---

## 测试规范

| 类型 | 目录 | 命名 |
|------|------|------|
| 单元测试 | `__tests__/` | `*.test.ts` |
| 集成测试 | `tests/integration/` | `*.spec.ts` |
| E2E 测试 | `tests/e2e/` | `*.e2e.ts` |

---

## 相关文档

- [architecture.md](architecture.md) - 系统架构
