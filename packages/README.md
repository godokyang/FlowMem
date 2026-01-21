# FlowMem v2 - Monorepo 结构

这是一个基于 Lerna 的 Monorepo，包含两个核心包：

## 包结构

```
flowmem/
├── packages/
│   ├── ccq-workflow/     # FlowMem 工作流引擎
│   │   ├── src/           # 源代码
│   │   ├── bin/           # CLI 入口
│   │   ├── templates/     # Markdown 模板
│   │   └── package.json
│   └── ccq-engine/       # 代码库上下文查询引擎
│       ├── src/
│       │   ├── cli/       # CLI 命令
│       │   ├── indexer/   # 索引系统
│       │   ├── embeddings/ # Embeddings 生成
│       │   ├── retrieval/  # 检索引擎
│       │   ├── storage/    # SQLite 存储
│       │   ├── mcp/       # MCP Server
│       │   └── core/       # 核心类型和工具
│       ├── bin/           # ccq CLI
│       ├── assets/        # WASM 资源
│       └── package.json
├── lerna.json            # Lerna 配置
├── package.json          # 根 package.json (workspaces)
├── adapters/            # 编辑器适配器（保留）
├── docs/               # 文档
└── examples/           # 示例项目
```

## 包说明

### @ccq/workflow
FlowMem 工作流引擎，提供：
- CLI 工具（flowmem init, audit, status, upgrade）
- AI 上下文记忆管理
- 编辑器适配器集成

### @ccq/engine
代码库上下文查询引擎，提供：
- AST 感知的代码切分
- 混合检索（BM25 + Vector）
- SQLite 持久化存储
- MCP Server 接口

## 常用命令

```bash
# 安装所有依赖
npm install

# 链接所有包
lerna bootstrap

# 运行所有包的测试
lerna run test

# 运行特定包的测试
lerna run test --scope @ccq/engine

# 构建所有包
lerna run build

# 发布到 npm
lerna publish from-package

# 清理 node_modules
lerna clean --yes
```

## 开发流程

1. 在 `packages/ccq-engine/` 或 `packages/ccq-workflow/` 中开发
2. 使用 `lerna bootstrap` 链接包之间的依赖
3. 使用 `lerna run dev` 并行运行开发模式
4. 测试通过后使用 `lerna publish` 发布

## 版本管理

- 使用 Lerna 的 independent 模式（每个包独立版本）
- 发布时自动基于 conventional commits 生成 changelog
- 遵循语义化版本（SemVer）
