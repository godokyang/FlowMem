# 实施方案 - 07 代码上下文检索模块

**问题**: `@ccq/engine` 是独立包，用户可能未安装或未索引，工作流不应强依赖它。

**解决方案**: 可选依赖 + 降级策略

---

## 1. 模块职责

| 职责 | 说明 |
|------|------|
| **抽象检索接口** | 统一的 ContextRetriever 接口 |
| **CCQEngine 集成** | 动态加载，不硬依赖 |
| **降级检索** | 无 CCQEngine 时使用简化实现 |
| **环境检测** | 启动时检查并提示用户 |

---

## 2. 架构设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         代码上下文检索架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Orchestrator / Agents                                                      │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ContextRetriever (接口)                          │    │
│  │                                                                     │    │
│  │  retrieve(query: string, topK?: number): Promise<CodeChunk[]>       │    │
│  │  isAvailable(): boolean                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│               ┌──────────────┴──────────────┐                               │
│               │                             │                               │
│               ▼                             ▼                               │
│  ┌─────────────────────────┐   ┌─────────────────────────┐                  │
│  │   CCQEngineRetriever    │   │    SimpleRetriever      │                  │
│  │   ─────────────────     │   │    ──────────────       │                  │
│  │   动态导入 @ccq/engine  │   │    glob + 关键词匹配    │                  │
│  │   语义搜索 + 向量检索   │   │    基础文件搜索         │                  │
│  │                         │   │                         │                  │
│  │   ✅ 高质量上下文       │   │   ⚠️ 基础上下文         │                  │
│  │   ❌ 需要预先索引       │   │   ✅ 始终可用           │                  │
│  └─────────────────────────┘   └─────────────────────────┘                  │
│                                                                             │
│  createRetriever() 工厂函数:                                                 │
│  1. 尝试加载 CCQEngineRetriever                                             │
│  2. 成功 → 返回 CCQEngineRetriever                                          │
│  3. 失败 → 返回 SimpleRetriever (降级)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 类型定义

```typescript
// 文件: packages/ccq-workflow/src/context/types.ts

/**
 * 代码片段
 */
export interface CodeChunk {
  /**
   * 文件路径（相对于项目根目录）
   */
  filePath: string;
  
  /**
   * 代码内容
   */
  content: string;
  
  /**
   * 编程语言
   */
  language: string;
  
  /**
   * 起始行号（可选）
   */
  startLine?: number;
  
  /**
   * 结束行号（可选）
   */
  endLine?: number;
  
  /**
   * 相关性分数（可选，0-1）
   */
  score?: number;
}

/**
 * 检索选项
 */
export interface RetrieveOptions {
  /**
   * 返回结果数量
   */
  topK?: number;
  
  /**
   * 文件类型过滤
   */
  fileTypes?: string[];
  
  /**
   * 排除路径
   */
  excludePaths?: string[];
}

/**
 * 检索器状态
 */
export interface RetrieverStatus {
  /**
   * 检索器类型
   */
  type: 'ccq-engine' | 'simple' | 'none';
  
  /**
   * 是否可用
   */
  available: boolean;
  
  /**
   * 索引文件数（如适用）
   */
  indexedFiles?: number;
  
  /**
   * 上次索引时间（如适用）
   */
  lastIndexed?: Date;
  
  /**
   * 警告信息
   */
  warning?: string;
}
```

---

## 4. 检索器接口

```typescript
// 文件: packages/ccq-workflow/src/context/retriever.ts

import { CodeChunk, RetrieveOptions, RetrieverStatus } from './types';

/**
 * 代码上下文检索器接口
 */
export interface ContextRetriever {
  /**
   * 检索相关代码
   */
  retrieve(query: string, options?: RetrieveOptions): Promise<CodeChunk[]>;
  
  /**
   * 检查是否可用
   */
  isAvailable(): boolean;
  
  /**
   * 获取状态信息
   */
  getStatus(): RetrieverStatus;
}
```

---

## 5. CCQEngine 实现

```typescript
// 文件: packages/ccq-workflow/src/context/ccq-engine-retriever.ts

import { ContextRetriever } from './retriever';
import { CodeChunk, RetrieveOptions, RetrieverStatus } from './types';

/**
 * CCQEngine 检索器
 * 
 * 特点：
 * - 动态导入 @ccq/engine，不硬依赖
 * - 需要预先运行 `npx @ccq/engine index`
 * - 提供高质量语义搜索
 */
export class CCQEngineRetriever implements ContextRetriever {
  private engine: any = null;
  private status: RetrieverStatus = {
    type: 'ccq-engine',
    available: false
  };
  
  /**
   * 初始化检索器
   * 
   * @returns 是否初始化成功
   */
  async initialize(): Promise<boolean> {
    try {
      // 动态导入，避免硬依赖
      const ccqModule = await this.dynamicImport();
      
      if (!ccqModule) {
        this.status.warning = '@ccq/engine 未安装';
        return false;
      }
      
      const { CCQEngine } = ccqModule;
      this.engine = new CCQEngine();
      
      // 尝试加载已有索引
      const loaded = await this.engine.load();
      
      if (!loaded) {
        this.status.warning = '索引未创建，请运行: npx @ccq/engine index';
        return false;
      }
      
      // 获取索引信息
      const info = await this.engine.getInfo();
      
      this.status = {
        type: 'ccq-engine',
        available: true,
        indexedFiles: info.fileCount,
        lastIndexed: info.lastIndexed
      };
      
      return true;
    } catch (error) {
      this.status.warning = `初始化失败: ${error.message}`;
      return false;
    }
  }
  
  /**
   * 动态导入 @ccq/engine
   */
  private async dynamicImport(): Promise<any | null> {
    try {
      // 使用动态 import
      return await import('@ccq/engine');
    } catch {
      return null;
    }
  }
  
  isAvailable(): boolean {
    return this.engine !== null && this.status.available;
  }
  
  getStatus(): RetrieverStatus {
    return { ...this.status };
  }
  
  async retrieve(query: string, options: RetrieveOptions = {}): Promise<CodeChunk[]> {
    if (!this.isAvailable()) {
      return [];
    }
    
    const { topK = 15, fileTypes, excludePaths } = options;
    
    try {
      const results = await this.engine.retrieve({
        query,
        topK,
        filter: {
          fileTypes,
          excludePaths
        }
      });
      
      return results.map((r: any) => ({
        filePath: r.filePath,
        content: r.content,
        language: r.language,
        startLine: r.startLine,
        endLine: r.endLine,
        score: r.score
      }));
    } catch (error) {
      console.warn(`CCQEngine 检索失败: ${error.message}`);
      return [];
    }
  }
}
```

---

## 6. 简化检索器（降级实现）

```typescript
// 文件: packages/ccq-workflow/src/context/simple-retriever.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { ContextRetriever } from './retriever';
import { CodeChunk, RetrieveOptions, RetrieverStatus } from './types';

/**
 * 简化检索器
 * 
 * 特点：
 * - 始终可用，无需预先配置
 * - 基于 glob + 关键词匹配
 * - 检索质量较低，但足够基础使用
 */
export class SimpleRetriever implements ContextRetriever {
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  isAvailable(): boolean {
    return true; // 始终可用
  }
  
  getStatus(): RetrieverStatus {
    return {
      type: 'simple',
      available: true,
      warning: '使用简化检索，安装 @ccq/engine 可获得更好效果'
    };
  }
  
  async retrieve(query: string, options: RetrieveOptions = {}): Promise<CodeChunk[]> {
    const { topK = 15, fileTypes, excludePaths = [] } = options;
    
    // 1. 提取关键词
    const keywords = this.extractKeywords(query);
    
    if (keywords.length === 0) {
      return [];
    }
    
    // 2. 搜索相关文件
    const files = await this.findRelevantFiles(keywords, fileTypes, excludePaths);
    
    // 3. 读取并评分
    const chunks: CodeChunk[] = [];
    
    for (const filePath of files.slice(0, topK * 2)) {
      try {
        const content = await fs.readFile(
          path.join(this.projectRoot, filePath), 
          'utf-8'
        );
        
        const score = this.calculateRelevance(content, keywords);
        
        if (score > 0) {
          chunks.push({
            filePath,
            content: this.truncateContent(content),
            language: this.detectLanguage(filePath),
            score
          });
        }
      } catch {
        // 文件读取失败，跳过
      }
    }
    
    // 4. 按相关性排序
    chunks.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return chunks.slice(0, topK);
  }
  
  /**
   * 提取关键词
   */
  private extractKeywords(query: string): string[] {
    // 移除常见停用词
    const stopWords = new Set([
      '的', '是', '在', '和', '有', '我', '这', '你',
      'the', 'a', 'an', 'is', 'are', 'to', 'for', 'of', 'and', 'in'
    ]);
    
    // 提取中英文词汇
    const words = query
      .toLowerCase()
      .split(/[\s,，。.!！?？;；:：\-_]+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));
    
    // 添加同义词/相关词
    const expanded = new Set(words);
    
    const synonyms: Record<string, string[]> = {
      '登录': ['login', 'auth', 'signin', 'authentication'],
      '用户': ['user', 'account', 'profile'],
      '密码': ['password', 'credential', 'secret'],
      'login': ['登录', 'auth', 'signin'],
      'user': ['用户', 'account'],
      'api': ['接口', 'endpoint', 'route'],
      'database': ['数据库', 'db', 'sql'],
    };
    
    for (const word of words) {
      if (synonyms[word]) {
        synonyms[word].forEach(s => expanded.add(s));
      }
    }
    
    return Array.from(expanded);
  }
  
  /**
   * 查找相关文件
   */
  private async findRelevantFiles(
    keywords: string[],
    fileTypes?: string[],
    excludePaths: string[] = []
  ): Promise<string[]> {
    // 默认搜索的文件类型
    const defaultTypes = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java'];
    const types = fileTypes || defaultTypes;
    
    const pattern = `**/*.{${types.join(',')}}`;
    
    const files = await glob(pattern, {
      cwd: this.projectRoot,
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.min.*',
        ...excludePaths
      ]
    });
    
    // 按文件名相关性排序
    const scored = files.map(file => {
      const fileName = path.basename(file).toLowerCase();
      const dirName = path.dirname(file).toLowerCase();
      
      let score = 0;
      
      for (const keyword of keywords) {
        if (fileName.includes(keyword)) score += 3;
        if (dirName.includes(keyword)) score += 2;
      }
      
      return { file, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored.map(s => s.file);
  }
  
  /**
   * 计算内容相关性
   */
  private calculateRelevance(content: string, keywords: string[]): number {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      const count = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
      score += Math.min(count, 5); // 每个关键词最多贡献 5 分
    }
    
    // 归一化到 0-1
    return Math.min(score / (keywords.length * 5), 1);
  }
  
  /**
   * 截断过长内容
   */
  private truncateContent(content: string, maxLines = 100): string {
    const lines = content.split('\n');
    
    if (lines.length <= maxLines) {
      return content;
    }
    
    return lines.slice(0, maxLines).join('\n') + '\n// ... (truncated)';
  }
  
  /**
   * 检测编程语言
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).slice(1);
    
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    
    return langMap[ext] || ext;
  }
}
```

---

## 7. 工厂函数

```typescript
// 文件: packages/ccq-workflow/src/context/factory.ts

import { ContextRetriever } from './retriever';
import { CCQEngineRetriever } from './ccq-engine-retriever';
import { SimpleRetriever } from './simple-retriever';

/**
 * 创建检索器
 * 
 * 优先使用 CCQEngine，不可用时降级到 SimpleRetriever
 */
export async function createRetriever(projectRoot: string): Promise<ContextRetriever> {
  // 1. 尝试使用 CCQEngine
  const ccqRetriever = new CCQEngineRetriever();
  const ccqAvailable = await ccqRetriever.initialize();
  
  if (ccqAvailable) {
    return ccqRetriever;
  }
  
  // 2. 降级到简化检索器
  return new SimpleRetriever(projectRoot);
}

/**
 * 检查检索器状态并打印提示
 */
export function printRetrieverStatus(retriever: ContextRetriever): void {
  const status = retriever.getStatus();
  
  if (status.type === 'ccq-engine' && status.available) {
    console.log('  ✅ @ccq/engine 已就绪');
    if (status.indexedFiles) {
      console.log(`     已索引 ${status.indexedFiles} 个文件`);
    }
  } else if (status.type === 'simple') {
    console.log('  ⚠️  使用简化检索');
    console.log('     建议安装 @ccq/engine 以获得更好效果:');
    console.log('     npm install @ccq/engine');
    console.log('     npx @ccq/engine index');
  }
  
  if (status.warning) {
    console.log(`  💡 ${status.warning}`);
  }
}
```

---

## 8. 在 Orchestrator 中使用

```typescript
// 文件: packages/ccq-workflow/src/orchestrator/orchestrator.ts (更新)

import { ContextRetriever, createRetriever, printRetrieverStatus } from '../context';

export class Orchestrator {
  private retriever: ContextRetriever;
  
  /**
   * 初始化 Orchestrator
   */
  async initialize(): Promise<void> {
    // 创建检索器（自动选择最佳实现）
    this.retriever = await createRetriever(this.projectRoot);
    
    // 打印状态
    console.log('\n🔍 检查代码检索器...');
    printRetrieverStatus(this.retriever);
    console.log('');
  }
  
  /**
   * 1.1 上下文检索
   */
  private async handleContextRetrieval(): Promise<WorkflowPhase> {
    // 使用抽象接口，不直接依赖 CCQEngine
    const context = await this.retriever.retrieve(
      this.context.userRequest,
      { topK: 15 }
    );
    
    // 检查检索结果
    if (context.length === 0) {
      console.log('  ⚠️  未找到相关代码上下文');
    } else {
      console.log(`  📂 找到 ${context.length} 个相关代码片段`);
    }
    
    // 归纳代码上下文为约束
    const constraints = await this.summarizeConstraints(context);
    
    this.context.phaseData.codeContext = context;
    this.context.memory.constraints = constraints;
    
    return WorkflowPhase.PHASE1_ANALYST_SCORING;
  }
}
```

---

## 9. package.json 配置

```json
{
  "name": "@ccq/workflow",
  "dependencies": {
    "glob": "^10.0.0",
    "commander": "^12.0.0",
    "chalk": "^5.0.0"
  },
  "optionalDependencies": {
    "@ccq/engine": "^2.0.0"
  },
  "peerDependencies": {
    "@ccq/engine": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "@ccq/engine": {
      "optional": true
    }
  }
}
```

---

## 10. CLI 启动时检查

```typescript
// 文件: packages/ccq-workflow/src/cli/commands/workflow.ts (更新)

workflow
  .command('start')
  .action(async (request: string, options) => {
    console.log(chalk.blue('\n🔍 检查环境...\n'));
    
    // 检查检索器
    const retriever = await createRetriever(projectRoot);
    const status = retriever.getStatus();
    
    if (status.type === 'ccq-engine' && status.available) {
      console.log(chalk.green('  ✅ @ccq/engine 已就绪'));
      if (status.indexedFiles) {
        console.log(chalk.gray(`     已索引 ${status.indexedFiles} 个文件`));
      }
    } else {
      console.log(chalk.yellow('  ⚠️  @ccq/engine 未配置，使用简化检索'));
      console.log(chalk.gray(''));
      console.log(chalk.gray('  💡 安装 @ccq/engine 可获得更好的代码理解效果:'));
      console.log(chalk.gray('     npm install @ccq/engine'));
      console.log(chalk.gray('     npx @ccq/engine index'));
      console.log('');
    }
    
    // 继续工作流...
  });
```

---

## 11. 文件结构

```
packages/ccq-workflow/src/context/
├── index.ts                    # 导出入口
├── types.ts                    # 类型定义
├── retriever.ts                # 检索器接口
├── ccq-engine-retriever.ts     # CCQEngine 实现
├── simple-retriever.ts         # 简化检索实现
└── factory.ts                  # 工厂函数
```

---

## 12. 验收标准

| 检查项 | 通过条件 |
|--------|----------|
| **无 CCQEngine 可运行** | 未安装 @ccq/engine 时工作流仍可启动 |
| **动态加载** | 不产生硬依赖，import 失败时优雅降级 |
| **状态提示** | 启动时清晰显示使用哪个检索器 |
| **简化检索可用** | SimpleRetriever 能返回基本相关结果 |
| **CCQEngine 优先** | 已配置时优先使用 CCQEngine |

---

## 13. 测试要点

```typescript
describe('ContextRetriever', () => {
  describe('CCQEngineRetriever', () => {
    it('should return false when @ccq/engine not installed', async () => {
      // Mock import 失败
      const retriever = new CCQEngineRetriever();
      const available = await retriever.initialize();
      expect(available).toBe(false);
    });
    
    it('should return false when index not created', async () => {
      // Mock engine.load() 返回 false
    });
  });
  
  describe('SimpleRetriever', () => {
    it('should always be available', () => {
      const retriever = new SimpleRetriever('/project');
      expect(retriever.isAvailable()).toBe(true);
    });
    
    it('should extract keywords from query', async () => {
      const retriever = new SimpleRetriever('/project');
      const chunks = await retriever.retrieve('实现用户登录功能');
      // 应该搜索包含 login, auth, user 等关键词的文件
    });
  });
  
  describe('createRetriever', () => {
    it('should fallback to SimpleRetriever when CCQEngine unavailable', async () => {
      const retriever = await createRetriever('/project');
      expect(retriever.getStatus().type).toBe('simple');
    });
  });
});
```
