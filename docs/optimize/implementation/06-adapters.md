# 实施方案 - 06 适配器同步模块

**对应设计文档**: `../design/workflow-optimization-proposal-07-integration.md`

---

## 1. 模块职责

适配器同步模块负责：

| 职责 | 说明 |
|------|------|
| **规则同步** | 将 common-rules 同步到各编辑器适配器 |
| **工作流注入** | 在适配器中嵌入四阶段工作流指令 |
| **版本管理** | 跟踪规则版本，支持增量更新 |
| **构建自动化** | 通过脚本统一生成适配器 |

---

## 2. 架构设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           适配器同步架构                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  源文件                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  templates/                                                         │    │
│  │  ├── common-rules.md           # 通用规则                           │    │
│  │  ├── workflow-section.md       # 工作流章节                          │    │
│  │  └── adapters/                                                     │    │
│  │      ├── cursor.template.md    # Cursor 模板                        │    │
│  │      ├── windsurf.template.md  # Windsurf 模板                      │    │
│  │      └── ...                                                       │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                        │                                    │
│                                        ▼                                    │
│  构建器                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  AdapterBuilder                                                     │    │
│  │  ├── 加载 common-rules.md                                          │    │
│  │  ├── 注入 workflow-section.md                                      │    │
│  │  ├── 应用各适配器模板                                                │    │
│  │  └── 生成最终文件                                                   │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                        │                                    │
│                                        ▼                                    │
│  输出文件                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  adapters/                                                          │    │
│  │  ├── cursor/                                                       │    │
│  │  │   └── rules.md                                                  │    │
│  │  ├── windsurf/                                                     │    │
│  │  │   └── rules.md                                                  │    │
│  │  ├── vscode/                                                       │    │
│  │  │   └── rules.md                                                  │    │
│  │  └── ...                                                           │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 模板结构

### 3.1 common-rules.md（通用规则）

```markdown
<!-- 文件: templates/common-rules.md -->

# FlowMem 通用规则 v2.0

## 核心原则

1. **遵循工作流**: 所有开发任务必须遵循四阶段工作流
2. **使用 CLI**: 受保护文件必须通过 flowmem CLI 修改
3. **完成验收**: 每个 todo 必须满足验收条件才能标记完成
4. **不偷懒**: 禁止 console.log('TODO') 等敷衍实现

## 受保护文件

以下文件禁止直接编辑，必须通过 CLI：

- `.agentmem/request.md`
- `.agentmem/todolist.md`
- `.agentmem/project.md`

## 代码规范

- 不使用 `as any` 或 `@ts-ignore`
- 不留空的 catch 块
- 必须处理错误情况
- 遵循项目现有代码风格

{{WORKFLOW_SECTION}}

## 命令参考

```bash
# 工作流
flowmem workflow start "需求描述"
flowmem workflow status

# Todo 管理
flowmem todo list
flowmem todo status TODO-001 completed

# 审计
flowmem audit pre-commit
```
```

### 3.2 workflow-section.md（工作流章节）

```markdown
<!-- 文件: templates/workflow-section.md -->

## 工作流程（四阶段）

### 何时触发？

满足以下任一条件时，必须使用完整工作流：

- 预估修改 ≥3 个文件
- 预估工具调用 ≥10 次
- 用户明确提到"规划"、"设计"
- 涉及新功能开发

### 阶段概览

| 阶段 | 产出 | 用户介入 |
|------|------|----------|
| 1. 需求澄清 | request.md | 需求追问 + 方案确认 |
| 2. 详细规划 | todolist.md | 规划确认 |
| 3. 执行与审核 | 代码变更 | 高风险确认 |
| 4. 交付 | 交付报告 | 无 |

### 阶段 1: 需求澄清

1. 分析用户需求，评估完整性（0-10 分）
2. 低于阈值则追问 2-3 个具体问题
3. 设计技术方案，经审核后提交用户确认
4. 确认后生成 `.agentmem/request.md`

### 阶段 2: 详细规划

1. 将方案分解为可执行的任务列表
2. 识别依赖关系，估算工作量
3. 用户确认后生成 `.agentmem/todolist.md`

### 阶段 3: 执行与审核

1. 按顺序执行每个 todo
2. 每完成一个 todo 进行自动审核
3. 审核不通过则修改重做
4. 高风险变更需用户确认
5. 使用 `flowmem todo status` 更新状态

### 阶段 4: 交付

1. 对照验收标准检查
2. 运行测试（如有）
3. 生成交付报告
```

### 3.3 适配器模板示例

```markdown
<!-- 文件: templates/adapters/cursor.template.md -->

# Cursor Rules for FlowMem

{{COMMON_RULES}}

## Cursor 特定配置

### 文件关联

```json
{
  "*.md": "markdown",
  ".agentmem/*": "markdown"
}
```

### 快捷操作

- `Cmd+Shift+F`: 在 .agentmem 目录搜索
- `Cmd+Shift+T`: 打开 todolist.md

### 推荐扩展

- Markdown Preview Enhanced
- YAML Support
```

---

## 4. 构建器实现

### 4.1 类型定义

```typescript
// 文件: packages/ccq-workflow/src/adapters/types.ts

/**
 * 适配器定义
 */
export interface AdapterDefinition {
  name: string;
  displayName: string;
  templatePath: string;
  outputPath: string;
  
  /**
   * 适配器特定的变量替换
   */
  variables?: Record<string, string>;
  
  /**
   * 后处理函数
   */
  postProcess?: (content: string) => string;
}

/**
 * 构建配置
 */
export interface BuildConfig {
  /**
   * 模板目录
   */
  templateDir: string;
  
  /**
   * 输出目录
   */
  outputDir: string;
  
  /**
   * 适配器列表
   */
  adapters: AdapterDefinition[];
  
  /**
   * 全局变量
   */
  globalVariables?: Record<string, string>;
}

/**
 * 构建结果
 */
export interface BuildResult {
  success: boolean;
  adapters: Array<{
    name: string;
    outputPath: string;
    success: boolean;
    error?: string;
  }>;
  totalTime: number;
}
```

### 4.2 AdapterBuilder

```typescript
// 文件: packages/ccq-workflow/src/adapters/builder.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  AdapterDefinition, 
  BuildConfig, 
  BuildResult 
} from './types';

/**
 * 适配器构建器
 */
export class AdapterBuilder {
  private config: BuildConfig;
  private commonRules: string = '';
  private workflowSection: string = '';
  
  constructor(config: BuildConfig) {
    this.config = config;
  }
  
  /**
   * 构建所有适配器
   */
  async buildAll(): Promise<BuildResult> {
    const startTime = Date.now();
    const results: BuildResult['adapters'] = [];
    
    // 1. 加载通用规则
    await this.loadCommonRules();
    
    // 2. 加载工作流章节
    await this.loadWorkflowSection();
    
    // 3. 构建每个适配器
    for (const adapter of this.config.adapters) {
      try {
        await this.buildAdapter(adapter);
        results.push({
          name: adapter.name,
          outputPath: adapter.outputPath,
          success: true
        });
      } catch (error) {
        results.push({
          name: adapter.name,
          outputPath: adapter.outputPath,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: results.every(r => r.success),
      adapters: results,
      totalTime: Date.now() - startTime
    };
  }
  
  /**
   * 构建单个适配器
   */
  async buildAdapter(adapter: AdapterDefinition): Promise<void> {
    // 1. 读取模板
    const templatePath = path.join(this.config.templateDir, adapter.templatePath);
    let content = await fs.readFile(templatePath, 'utf-8');
    
    // 2. 注入通用规则
    content = this.injectCommonRules(content);
    
    // 3. 注入工作流章节
    content = this.injectWorkflowSection(content);
    
    // 4. 替换适配器特定变量
    content = this.replaceVariables(content, {
      ...this.config.globalVariables,
      ...adapter.variables
    });
    
    // 5. 后处理
    if (adapter.postProcess) {
      content = adapter.postProcess(content);
    }
    
    // 6. 添加生成头部
    content = this.addHeader(adapter, content);
    
    // 7. 写入输出
    const outputPath = path.join(this.config.outputDir, adapter.outputPath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
  }
  
  /**
   * 加载通用规则
   */
  private async loadCommonRules(): Promise<void> {
    const rulesPath = path.join(this.config.templateDir, 'common-rules.md');
    this.commonRules = await fs.readFile(rulesPath, 'utf-8');
  }
  
  /**
   * 加载工作流章节
   */
  private async loadWorkflowSection(): Promise<void> {
    const sectionPath = path.join(this.config.templateDir, 'workflow-section.md');
    this.workflowSection = await fs.readFile(sectionPath, 'utf-8');
  }
  
  /**
   * 注入通用规则
   */
  private injectCommonRules(content: string): string {
    // 先在通用规则中注入工作流章节
    const rulesWithWorkflow = this.commonRules.replace(
      '{{WORKFLOW_SECTION}}',
      this.workflowSection
    );
    
    return content.replace('{{COMMON_RULES}}', rulesWithWorkflow);
  }
  
  /**
   * 注入工作流章节
   */
  private injectWorkflowSection(content: string): string {
    return content.replace('{{WORKFLOW_SECTION}}', this.workflowSection);
  }
  
  /**
   * 替换变量
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, value);
    }
    
    return result;
  }
  
  /**
   * 添加生成头部
   */
  private addHeader(adapter: AdapterDefinition, content: string): string {
    const header = `<!--
  FlowMem Adapter Rules
  =====================
  
  适配器: ${adapter.displayName}
  生成时间: ${new Date().toISOString()}
  版本: ${this.config.globalVariables?.VERSION || '2.0.0'}
  
  ⚠️  此文件由 build-adapters 自动生成
  ⚠️  请勿手动修改，修改会在下次构建时被覆盖
  
  源文件: templates/${adapter.templatePath}
-->

`;
    
    return header + content;
  }
}
```

### 4.3 默认配置

```typescript
// 文件: packages/ccq-workflow/src/adapters/config.ts

import { BuildConfig, AdapterDefinition } from './types';

/**
 * 支持的适配器列表
 */
export const SUPPORTED_ADAPTERS: AdapterDefinition[] = [
  {
    name: 'cursor',
    displayName: 'Cursor',
    templatePath: 'adapters/cursor.template.md',
    outputPath: 'cursor/rules.md'
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf',
    templatePath: 'adapters/windsurf.template.md',
    outputPath: 'windsurf/rules.md'
  },
  {
    name: 'vscode',
    displayName: 'VS Code',
    templatePath: 'adapters/vscode.template.md',
    outputPath: 'vscode/rules.md'
  },
  {
    name: 'zed',
    displayName: 'Zed',
    templatePath: 'adapters/zed.template.md',
    outputPath: 'zed/rules.md'
  },
  {
    name: 'claude',
    displayName: 'Claude Desktop',
    templatePath: 'adapters/claude.template.md',
    outputPath: 'claude/rules.md'
  },
  {
    name: 'aider',
    displayName: 'Aider',
    templatePath: 'adapters/aider.template.md',
    outputPath: 'aider/rules.md'
  },
  {
    name: 'generic',
    displayName: 'Generic',
    templatePath: 'adapters/generic.template.md',
    outputPath: 'generic/rules.md'
  }
];

/**
 * 默认构建配置
 */
export function getDefaultConfig(projectRoot: string): BuildConfig {
  return {
    templateDir: `${projectRoot}/templates`,
    outputDir: `${projectRoot}/adapters`,
    adapters: SUPPORTED_ADAPTERS,
    globalVariables: {
      VERSION: '2.0.0',
      BUILD_DATE: new Date().toISOString().split('T')[0]
    }
  };
}
```

---

## 5. 构建脚本

### 5.1 build-adapters.ts

```typescript
#!/usr/bin/env node
// 文件: packages/ccq-workflow/scripts/build-adapters.ts

import * as path from 'path';
import chalk from 'chalk';
import { AdapterBuilder } from '../src/adapters/builder';
import { getDefaultConfig } from '../src/adapters/config';

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const config = getDefaultConfig(projectRoot);
  
  console.log(chalk.blue('\n🔨 构建适配器规则...\n'));
  
  const builder = new AdapterBuilder(config);
  const result = await builder.buildAll();
  
  console.log('  适配器:');
  
  for (const adapter of result.adapters) {
    if (adapter.success) {
      console.log(chalk.green(`    ✅ ${adapter.name}`));
      console.log(chalk.gray(`       → ${adapter.outputPath}`));
    } else {
      console.log(chalk.red(`    ❌ ${adapter.name}`));
      console.log(chalk.gray(`       ${adapter.error}`));
    }
  }
  
  console.log('');
  
  if (result.success) {
    console.log(chalk.green(`✅ 构建完成 (${result.totalTime}ms)\n`));
  } else {
    console.log(chalk.red(`❌ 构建失败\n`));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red(`错误: ${error.message}`));
  process.exit(1);
});
```

### 5.2 package.json 脚本

```json
{
  "scripts": {
    "build:adapters": "ts-node scripts/build-adapters.ts",
    "watch:adapters": "nodemon --watch templates -e md --exec 'npm run build:adapters'",
    "prepublish": "npm run build:adapters"
  }
}
```

---

## 6. CI/CD 集成

### 6.1 GitHub Actions

```yaml
# 文件: .github/workflows/build-adapters.yml

name: Build Adapters

on:
  push:
    paths:
      - 'templates/**'
      - 'packages/ccq-workflow/src/adapters/**'
  pull_request:
    paths:
      - 'templates/**'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build adapters
        run: npm run build:adapters
      
      - name: Check for changes
        id: changes
        run: |
          if [[ -n $(git status adapters --porcelain) ]]; then
            echo "changed=true" >> $GITHUB_OUTPUT
          fi
      
      - name: Commit changes
        if: steps.changes.outputs.changed == 'true' && github.event_name == 'push'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add adapters
          git commit -m "chore: rebuild adapter rules [skip ci]"
          git push
```

---

## 7. 文件结构

```
packages/ccq-workflow/
├── src/adapters/
│   ├── index.ts                # 导出入口
│   ├── types.ts                # 类型定义
│   ├── builder.ts              # 构建器
│   └── config.ts               # 配置
├── scripts/
│   └── build-adapters.ts       # 构建脚本
└── templates/
    ├── common-rules.md         # 通用规则
    ├── workflow-section.md     # 工作流章节
    └── adapters/
        ├── cursor.template.md
        ├── windsurf.template.md
        ├── vscode.template.md
        ├── zed.template.md
        ├── claude.template.md
        ├── aider.template.md
        └── generic.template.md

adapters/                       # 输出目录
├── cursor/
│   └── rules.md
├── windsurf/
│   └── rules.md
└── ...
```

---

## 8. 验收标准

| 检查项 | 通过条件 |
|--------|----------|
| **模板替换** | {{COMMON_RULES}} 和 {{WORKFLOW_SECTION}} 正确替换 |
| **头部注释** | 每个输出文件包含生成时间和版本 |
| **7 个适配器** | 所有适配器都成功生成 |
| **CI 集成** | templates 变更后自动重建 |
| **可读性** | 生成的 rules.md 格式正确、可读 |

---

## 9. 测试要点

```typescript
describe('AdapterBuilder', () => {
  it('should inject common rules', async () => {
    const builder = new AdapterBuilder(testConfig);
    await builder.buildAll();
    
    const output = await fs.readFile('adapters/cursor/rules.md', 'utf-8');
    expect(output).toContain('# FlowMem 通用规则');
  });
  
  it('should inject workflow section', async () => {
    const builder = new AdapterBuilder(testConfig);
    await builder.buildAll();
    
    const output = await fs.readFile('adapters/cursor/rules.md', 'utf-8');
    expect(output).toContain('## 工作流程（四阶段）');
  });
  
  it('should add generation header', async () => {
    const builder = new AdapterBuilder(testConfig);
    await builder.buildAll();
    
    const output = await fs.readFile('adapters/cursor/rules.md', 'utf-8');
    expect(output).toContain('此文件由 build-adapters 自动生成');
  });
  
  it('should build all 7 adapters', async () => {
    const builder = new AdapterBuilder(testConfig);
    const result = await builder.buildAll();
    
    expect(result.adapters).toHaveLength(7);
    expect(result.success).toBe(true);
  });
});
```
