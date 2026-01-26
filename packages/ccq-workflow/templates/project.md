# [项目名称]

## 一句话描述

[这个项目是什么、为谁解决什么问题]

## 技术栈

- 语言: [TypeScript/Python/Go/...]
- 框架: [Next.js/FastAPI/Gin/...]
- 数据库: [PostgreSQL/MongoDB/...]
- 其他: [Redis/Docker/...]

## 目录结构

```
project/
├── src/           # 源代码
├── tests/         # 测试
├── docs/          # 文档
└── ...
```

## 🔗 代码检索

使用 ccq-engine 自动索引，AI 直接调用 codebase_retrieval。

如未启用 MCP，请手动维护以下模块说明。

## ⚠️ 必读注意事项

- [坑点1: 特殊约定]
- [坑点2: 不在代码里的重要信息]
- [坑点3: 历史遗留问题]

## 开发规范

### 命名规范
- 文件: kebab-case
- 变量: camelCase
- 常量: UPPER_SNAKE_CASE

### 代码风格
- 使用 ESLint/Prettier
- 单文件不超过 300 行
- 函数不超过 50 行

---

## Workflow 配置 (v2.8)

```yaml
workflow:
  # 高风险路径配置
  risk:
    high_paths:
      - "auth/"
      - "security/"
      - "migrations/"
      - "db/"
      - "infra/"
      - "config/"
      - ".github/workflows/"
      - ".env"

  # 测试策略配置
  tests:
    primary:
      - "lsp_diagnostics"
      - "npm test"
      - "npm run build"
    fallback:
      - "echo 'No tests configured'"

  # Reviewer 配置
  reviewer:
    skip_checks: []  # 可选跳过的检查项

  # Context Curator 配置
  context_curator: true  # 是否启用
```

---

## 模块说明（传统模式）

> 如启用 MCP 混合模式，以下内容可选维护

### 核心模块

#### [模块名称]
- 位置: `src/modules/xxx/`
- 职责: [模块职责]
- 关键文件:
  - `index.ts` - 入口
  - `service.ts` - 业务逻辑

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/xxx` | GET | [说明] |

---

## 更新日志

- {date}: 初始化项目
