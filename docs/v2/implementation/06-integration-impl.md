# 实施指南：06-Integration

> 本文档描述 `@ccq/engine` 与 FlowMem 工作流以及外部编辑器（Claude/Copilot）的集成实现。

## 1. FlowMem 集成

### 1.1 `@ccq/workflow` 调用 Engine

FlowMem 需要在执行过程中按需调用 Engine。

**依赖关系**:
`packages/ccq-workflow/package.json` 添加依赖:
```json
{
  "dependencies": {
    "@ccq/engine": "workspace:*"
  }
}
```

**代码调用 (`packages/ccq-workflow/src/tools/retrieval.ts`)**:
```typescript
import { ContextEngine, ConfigLoader } from '@ccq/engine';

export class RetrievalTool {
  private engine: ContextEngine;

  constructor(rootPath: string) {
    const config = ConfigLoader.load(rootPath);
    this.engine = new ContextEngine(config);
  }

  async search(query: string): Promise<string> {
    return await this.engine.retrieve(query);
  }
}
```

### 1.2 混合模式实现 (Hybrid Mode)

在检索结果中合并 `project.md` 内容。

**实现 (`src/retrieval/retriever.ts`)**:
```typescript
export class Retriever {
  async query(q: string): Promise<string> {
    // 1. 执行常规检索
    const chunks = await this.doSearch(q);
    
    // 2. 检查混合模式配置
    if (this.config.mode === 'hybrid' && this.config.hybrid.auto_include) {
      const projectMd = await this.readProjectMd();
      if (projectMd) {
        // 将 project.md 作为第一个 chunk 插入
        chunks.unshift(this.createProjectMdChunk(projectMd));
      }
    }
    
    return this.packer.pack(chunks);
  }
}
```

## 2. 配置文件加载 (`ConfigLoader`)

实现 `src/core/config-loader.ts`，负责读取 `.ccq/config.yaml` 并应用默认值。

**依赖**: `js-yaml`

```typescript
import yaml from 'js-yaml';
import fs from 'fs';

export class ConfigLoader {
  static load(root: string): Config {
    const configPath = path.join(root, '.ccq/config.yaml');
    if (!fs.existsSync(configPath)) {
      return DEFAULT_CONFIG;
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = yaml.load(content);
    return mergeDeep(DEFAULT_CONFIG, userConfig);
  }
}
```

## 3. 编辑器集成

此部分主要是配置文件的生成和文档说明，而非代码实现。

### 3.1 Claude Desktop 配置生成器
提供 CLI 命令快速生成配置。

```bash
ccq init --adapter claude-desktop
```

生成内容：
```json
{
  "mcpServers": {
    "ccq-engine": {
      "command": "npx",
      "args": ["ccq", "mcp"], // 使用 bin 别名
      "env": { "CCQ_ROOT": "${PWD}" }
    }
  }
}
```

### 3.2 VS Code 配置生成器
```bash
ccq init --adapter vscode
```

生成 `.vscode/mcp.json`。

## 4. 验证计划

1.  **混合模式测试**:
    - 在测试项目创建 `.agentmem/project.md`。
    - 启用 hybrid 模式。
    - 执行检索，验证结果开头是否包含 `project.md` 内容。
2.  **配置加载测试**:
    - 创建自定义 `.ccq/config.yaml`。
    - 验证程序运行时是否使用了自定义配置（例如修改 topK）。
3.  **集成测试**:
    - 在 FlowMem 工作流中实际调用 `codebase_retrieval`。

---
**下一步**：参考 `07-operations-impl.md` 实现运维监控与质量保障机制。
