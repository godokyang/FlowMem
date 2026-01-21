# 实施指南：00-Overview

> 本文档详细描述 `ccq-engine` 项目初始化与整体架构搭建的实施步骤。

## 1. 初始化 Monorepo

### 目标
建立基于 Lerna 的 Monorepo 结构，包含 `@ccq/workflow` 和 `@ccq/engine` 两个核心包。

### 实施步骤

1.  **创建项目根目录**
    ```bash
    mkdir flowmem
    cd flowmem
    npm init -y
    ```

2.  **安装 Lerna**
    ```bash
    npm install --save-dev lerna
    npx lerna init
    ```

3.  **配置 `lerna.json`**
    确保使用 npm client 并开启 workspace 支持（如果使用 npm workspace）。
    ```json
    {
      "packages": ["packages/*"],
      "version": "0.0.0",
      "npmClient": "npm",
      "useWorkspaces": true
    }
    ```

4.  **配置根 `package.json`**
    启用 workspaces。
    ```json
    {
      "name": "flowmem-root",
      "private": true,
      "workspaces": ["packages/*"],
      "devDependencies": {
        "lerna": "^8.0.0",
        "typescript": "^5.0.0",
        "@types/node": "^20.0.0"
      }
    }
    ```

5.  **创建包结构**
    ```bash
    mkdir -p packages/ccq-workflow packages/ccq-engine
    ```

6.  **初始化 `@ccq/workflow`**
    ```bash
    cd packages/ccq-workflow
    npm init -y
    # 修改 package.json name 为 @ccq/workflow
    ```
    创建基础目录结构：
    ```
    src/
      cli/
      adapters/
      templates/
      rules/
    ```

7.  **初始化 `@ccq/engine`**
    ```bash
    cd packages/ccq-engine
    npm init -y
    # 修改 package.json name 为 @ccq/engine
    ```
    创建基础目录结构：
    ```
    src/
      cli/
      indexer/
      embeddings/
      retrieval/
      mcp/
      storage/
    ```

### 验证
- 运行 `lerna list` 应显示两个包。
- 运行 `npm install` 成功安装依赖。

## 2. 配置开发环境

### TypeScript 配置
在根目录创建 `tsconfig.json` (base config)，并在各包中继承。

**根 `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**包 `tsconfig.json`**:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### ESLint & Prettier
安装并配置 ESLint 和 Prettier 以保持代码风格一致。

## 3. 依赖管理

### 核心依赖
在根目录或各包中安装核心依赖：

**@ccq/engine**:
- `commander` (CLI)
- `better-sqlite3` (Storage)
- `@modelcontextprotocol/sdk` (MCP)
- `web-tree-sitter` (Parser)
- `@xenova/transformers` (Embeddings)
- `zod` (Validation)

**@ccq/workflow**:
- `commander`
- `inquirer` (交互式 CLI)
- `chalk` (UI)

### 实施命令
```bash
lerna add commander --scope @ccq/engine
lerna add better-sqlite3 --scope @ccq/engine
# ... 其他依赖
```

## 4. 目录结构规范

确保遵循设计文档中的目录结构：

```
flowmem/
├── packages/
│   ├── ccq-workflow/
│   └── ccq-engine/
```

## 5. 测试计划

### 单元测试
使用 `jest` 或 `vitest`。
每个包下创建 `tests/` 目录。

### 集成测试
创建一个测试脚本，模拟 CLI 调用流程。

---
**下一步**：参考 `01-architecture-impl.md` 搭建核心模块脚手架。
