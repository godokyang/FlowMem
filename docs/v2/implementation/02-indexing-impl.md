# 实施指南：02-Indexing

> 本文档详细说明索引系统的实现细节，包括 Ignore 策略、基于 Tree-sitter 的多语言 Chunk 切分以及增量更新逻辑。

## 1. Ignore 策略实现

### 1.1 规则加载
实现 `IgnoreManager` 类，负责读取和解析 `.gitignore` 和 `.augmentignore`。

**依赖**: `ignore` (npm package)

```bash
npm install ignore
```

**实现 (`src/indexer/ignore-manager.ts`)**:
```typescript
import ignore from 'ignore';
import fs from 'fs/promises';
import path from 'path';

export class IgnoreManager {
  private ig = ignore();

  async loadRules(root: string) {
    // 1. 加载 .gitignore
    await this.addRuleFile(path.join(root, '.gitignore'));
    // 2. 加载 .augmentignore
    await this.addRuleFile(path.join(root, '.augmentignore'));
    
    // 3. 添加默认规则 (node_modules, .git, etc.)
    this.ig.add(['node_modules', '.git', '.ccq']);
  }

  private async addRuleFile(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.ig.add(content);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }

  ignores(filePath: string): boolean {
    return this.ig.ignores(filePath);
  }
}
```

## 2. Scanner 实现

结合 `IgnoreManager` 和文件系统扫描。

**实现 (`src/indexer/scanner.ts`)**:
```typescript
import { glob } from 'glob';
import { IgnoreManager } from './ignore-manager';

export class FileScanner {
  constructor(private ignoreManager: IgnoreManager) {}

  async scan(root: string): Promise<string[]> {
    // 使用 glob 扫描所有文件
    const allFiles = await glob('**/*', { 
      cwd: root, 
      nodir: true, 
      dot: true 
    });

    // 过滤
    return allFiles.filter(f => !this.ignoreManager.ignores(f));
  }
}
```

## 3. Chunker 实现 (核心)

### 3.1 架构
采用策略模式支持不同文件类型。

```typescript
interface IChunkingStrategy {
  chunk(content: string, lang?: string): Promise<Chunk[]>;
}

class ASTStrategy implements IChunkingStrategy { ... }
class MarkdownStrategy implements IChunkingStrategy { ... }
class LineStrategy implements IChunkingStrategy { ... } // Fallback
```

### 3.2 Tree-sitter 集成 (AST Strategy)

**依赖**: `web-tree-sitter`

**初始化 (`src/indexer/parser-factory.ts`)**:
```typescript
import Parser from 'web-tree-sitter';
import path from 'path';
import fs from 'fs/promises';

export class ParserFactory {
  private static initialized = false;
  private static parsers = new Map<string, Parser>();
  private static languages = new Map<string, Parser.Language>();
  private static wasmDir: string;

  // 初始化 Tree-sitter WASM 运行时
  static async init(wasmDir?: string) {
    if (this.initialized) return;
    
    // 默认从 node_modules 加载
    this.wasmDir = wasmDir || path.join(
      __dirname,
      '../../node_modules/web-tree-sitter'
    );
    
    await Parser.init({
      locateFile(scriptName: string) {
        return path.join(ParserFactory.wasmDir, scriptName);
      }
    });
    
    this.initialized = true;
  }

  // 获取语言 WASM 文件
  static async getLanguage(lang: string): Promise<Parser.Language | null> {
    if (this.languages.has(lang)) {
      return this.languages.get(lang)!;
    }

    // 查找 WASM 文件的可能路径
    const possiblePaths = [
      // 本地 assets 目录
      path.join(__dirname, `../../assets/tree-sitter-${lang}.wasm`),
      // node_modules 中的语言包
      path.join(__dirname, `../../node_modules/tree-sitter-${lang}/tree-sitter-${lang}.wasm`),
      // 用户配置的自定义路径
      process.env.CCQ_WASM_DIR 
        ? path.join(process.env.CCQ_WASM_DIR, `tree-sitter-${lang}.wasm`)
        : null
    ].filter(Boolean) as string[];

    for (const wasmPath of possiblePaths) {
      try {
        await fs.access(wasmPath);
        const language = await Parser.Language.load(wasmPath);
        this.languages.set(lang, language);
        return language;
      } catch (e) {
        // Try next path
        continue;
      }
    }

    // 未找到，返回 null 触发 Fallback
    console.warn(`⚠️  Tree-sitter grammar not found for ${lang}, using fallback chunker`);
    return null;
  }

  // 获取 Parser 实例（支持复用）
  static async getParser(lang: string): Promise<Parser | null> {
    const language = await this.getLanguage(lang);
    if (!language) return null;

    if (!this.parsers.has(lang)) {
      const parser = new Parser();
      parser.setLanguage(language);
      this.parsers.set(lang, parser);
    }

    return this.parsers.get(lang)!;
  }

  // 清理资源
  static cleanup() {
    this.parsers.clear();
    this.languages.clear();
  }
}
```

### WASM 资源管理策略

**策略 1: 预打包到 npm（推荐）**

在发布 npm 包时，将常用语言的 WASM 文件打包进去。

```json
// package.json
{
  "files": [
    "dist",
    "assets/*.wasm"
  ]
}
```

**安装脚本 (`scripts/download-grammars.js`)**:
```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const GRAMMARS = [
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'cpp',
  'c'
];

const TREE_SITTER_VERSION = '0.20.8';
const ASSETS_DIR = path.join(__dirname, '../assets');

async function downloadGrammar(lang) {
  const url = `https://github.com/tree-sitter/tree-sitter-${lang}/releases/download/v${TREE_SITTER_VERSION}/tree-sitter-${lang}.wasm`;
  const dest = path.join(ASSETS_DIR, `tree-sitter-${lang}.wasm`);

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // 处理重定向
        https.get(res.headers.location, (res2) => {
          const file = fs.createWriteStream(dest);
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✓ ${lang}`);
            resolve();
          });
        });
      } else {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ ${lang}`);
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  console.log('Downloading Tree-sitter WASM grammars...');
  
  for (const lang of GRAMMARS) {
    try {
      await downloadGrammar(lang);
    } catch (e) {
      console.error(`✗ ${lang}: ${e.message}`);
    }
  }

  console.log('Done!');
}

main();
```

添加到 `package.json`:
```json
{
  "scripts": {
    "postinstall": "node scripts/download-grammars.js"
  }
}
```

**策略 2: 按需下载（减少包体积）**

仅在首次使用某语言时下载对应 WASM。

```typescript
// src/indexer/lazy-wasm-loader.ts
export class LazyWASMLoader {
  private static cache = new Map<string, Parser.Language>();

  static async load(lang: string): Promise<Parser.Language | null> {
    if (this.cache.has(lang)) {
      return this.cache.get(lang)!;
    }

    const cachePath = path.join(os.homedir(), '.ccq/wasm-cache');
    const wasmPath = path.join(cachePath, `tree-sitter-${lang}.wasm`);

    // 检查本地缓存
    if (await fileExists(wasmPath)) {
      const language = await Parser.Language.load(wasmPath);
      this.cache.set(lang, language);
      return language;
    }

    // 下载
    console.log(`Downloading grammar for ${lang}...`);
    const url = `https://github.com/tree-sitter/tree-sitter-${lang}/releases/latest/download/tree-sitter-${lang}.wasm`;
    
    try {
      await downloadFile(url, wasmPath);
      const language = await Parser.Language.load(wasmPath);
      this.cache.set(lang, language);
      return language;
    } catch (e) {
      console.warn(`Failed to download ${lang} grammar:`, e);
      return null;
    }
  }
}
```

**策略对比**:
| 策略 | 包体积 | 首次使用速度 | 离线支持 |
|------|--------|--------------|----------|
| 预打包 | 大 (~5MB) | 快 | ✅ |
| 按需下载 | 小 (\u003c500KB) | 慢（首次） | ❌ |

**推荐**: 对于 Tier 1 语言（TS/JS/Python）使用预打包，其他语言按需下载。

```

**通用 AST 切分逻辑 (`src/indexer/chunkers/ast-chunker.ts`)**:
```typescript
export class ASTChunker {
  async chunk(content: string, lang: string): Promise<Chunk[]> {
    const parser = new Parser();
    const language = await ParserFactory.getLanguage(lang);
    if (!language) {
      // Fallback to line chunker
      return new LineChunker().chunk(content);
    }
    parser.setLanguage(language);
    const tree = parser.parse(content);
    
    const chunks: Chunk[] = [];
    
    // 遍历 AST 寻找边界节点
    // 定义各语言的边界节点类型，例如:
    // ['function_declaration', 'class_declaration', 'method_definition']
    
    const cursor = tree.walk();
    // ... 遍历逻辑 ...
    
    return chunks;
  }
}
```

**语言特定边界配置**:
建立一个配置表映射语言到节点类型。
```typescript
const BOUNDARIES = {
  typescript: ['function_declaration', 'class_declaration', 'interface_declaration'],
  python: ['function_definition', 'class_definition'],
  // ...
};
```

### 3.3 Markdown Chunker
按 Heading 切分。

### 3.4 Fallback Chunker
固定字符数（如 1500 chars）+ 重叠（200 chars）。

## 4. Chunk 数据结构

定义统一的 Chunk 接口：

```typescript
export interface Chunk {
  id: string;           // path:idx
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'code' | 'markdown' | 'text';
  tokens: number;       // Token 计数
  hash: string;         // 内容哈希
}
```

## 5. 测试计划

1.  **Ignore 测试**: 创建包含 `.gitignore` 的临时目录，验证扫描结果是否正确排除了文件。
2.  **Parser 加载测试**: 验证能否正确加载 TypeScript/Python 的 wasm 文件。
3.  **AST 切分测试**:
    - 输入一个包含多个函数的 TS 文件。
    - 验证输出的 Chunks 数量和内容是否符合预期（每个函数一个 chunk）。
4.  **Fallback 测试**: 输入无 Parser 支持的文件，验证是否按长度切分。

---
**下一步**：参考 `03-retrieval-impl.md` 实现 Embedding 和检索逻辑。
