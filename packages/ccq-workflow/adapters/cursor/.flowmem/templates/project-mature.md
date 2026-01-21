# [项目名称]

## 一句话描述
[用一句话说清楚这个项目是什么、为谁解决什么问题]

---

## 核心业务逻辑

[2-3 句话描述核心业务]

### 关键模块速览
| 模块 | 一句话职责 | 详细文档 |
|------|------------|----------|
| 用户认证 | 注册/登录/权限控制 | → [auth.md](docs/modules/auth.md) |
| 支付系统 | 订单支付与退款处理 | → [payment.md](docs/modules/payment.md) |
| ... | ... | ... |

> 📖 **完整业务逻辑**：[docs/business-logic.md](docs/business-logic.md)

---

## 技术栈
- 语言: [如 TypeScript, Python]
- 框架: [如 Next.js, FastAPI]
- 数据库: [如 PostgreSQL, MongoDB]
- 其他: [如 Docker, Redis]

> 📖 **架构详解**：[docs/architecture.md](docs/architecture.md)

---

## 目录结构
```
src/
├── api/          # API 路由
├── components/   # UI 组件
├── services/     # 业务逻辑
└── utils/        # 工具函数
```

---

## 核心概念/术语
| 术语 | 含义 |
|------|------|
| [术语1] | [解释] |
| [术语2] | [解释] |

---

## 约定与规范（速览）
- 代码风格: ESLint + Prettier
- 命名规范: camelCase
- Git 分支: main/develop/feature-*

> 📖 **完整规范**：[docs/conventions.md](docs/conventions.md)

---

## 当前状态
- **版本**: v1.0.0
- **阶段**: 开发中
- **最近变更**: [简述]

---

## ⚠️ 必读注意事项
- [最关键的坑点1]
- [最关键的坑点2]

---

## 📚 详细文档索引

| 文档 | 内容 | 何时阅读 |
|------|------|----------|
| [business-logic.md](docs/business-logic.md) | 完整业务流程 | 理解业务需求时 |
| [architecture.md](docs/architecture.md) | 系统架构设计 | 做架构级改动时 |
| [data-models.md](docs/data-models.md) | 数据库模型 | 涉及数据层改动时 |
| [conventions.md](docs/conventions.md) | 完整编码规范 | 新增代码时参考 |
| [modules/*.md](docs/modules/) | 各模块详解 | 修改特定模块时 |
