# 实施指南：07-Operations

> 本文档描述系统的可观测性、错误处理、安全机制以及性能优化策略的实施。

## 1. 日志与错误处理

### 1.1 日志系统 (`src/core/logger.ts`)
使用 `winston` 或简单封装 `console`，支持日志级别和文件输出。

```typescript
import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;

  constructor(logDir: string) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
      ],
    });
    
    // 非生产环境输出到控制台
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple(),
      }));
    }
  }
  
  info(msg: string, meta?: any) { this.logger.info(msg, meta); }
  error(msg: string, meta?: any) { this.logger.error(msg, meta); }
}
```

### 1.2 全局错误捕获
在 CLI 和 MCP Server 入口处添加 `try-catch` 和 `process.on('uncaughtException')`。

```typescript
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});
```

## 2. 安全机制

### 2.1 敏感文件过滤
在 `IgnoreManager` 中强制添加安全规则。

```typescript
// src/indexer/ignore-manager.ts
const FORCE_IGNORE = [
  '.env*', 
  '**/*.pem', 
  '**/*.key', 
  '**/id_rsa',
  'config/secrets.*'
];

// 在加载用户规则后应用
this.ig.add(FORCE_IGNORE);
```

### 2.2 路径安全检查
防止目录遍历攻击 (Path Traversal)。

```typescript
// src/utils/path.ts
export function isSafePath(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}
```

在所有文件操作前调用此检查。

## 3. 性能优化实施

### 3.1 数据库 WAL 模式
在 `DBManager` 初始化时开启。

```typescript
this.db.pragma('journal_mode = WAL');
this.db.pragma('synchronous = NORMAL'); // 提升写入性能，牺牲极少安全性
```

### 3.2 批量写入
在索引过程中，积攒一定数量（如 100 个 chunk）后批量写入 DB。

```typescript
// src/indexer/indexer.ts
async indexFiles(files: string[]) {
  const BATCH_SIZE = 100;
  let batch: Chunk[] = [];
  
  for (const file of files) {
    const chunks = await this.chunker.chunk(file);
    batch.push(...chunks);
    
    if (batch.length >= BATCH_SIZE) {
      await this.storage.saveChunks(batch);
      batch = [];
    }
  }
  // 保存剩余
  if (batch.length > 0) await this.storage.saveChunks(batch);
}
```

## 4. 质量保障 (QA)

### 4.1 性能基准测试脚本 (`scripts/benchmark.ts`)

创建一个脚本，生成大量随机文件或使用开源仓库，测量：
1.  索引时间 vs 文件数量
2.  检索延迟 vs DB 大小

**实现**:
```typescript
// scripts/benchmark.ts
import { ContextEngine } from '../src/engine';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  phase: string;
  duration: number;      // ms
  filesProcessed: number;
  chunksCreated: number;
  throughput: number;    // files/sec
}

async function runBenchmark(repoPath: string): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const config = {
    rootPath: repoPath,
    dbPath: `${repoPath}/.ccq/benchmark.db`
  };

  const engine = new ContextEngine(config);

  // 1. 索引阶段
  console.log('📊 Benchmarking indexing phase...');
  const indexStart = performance.now();
  const indexStats = await engine.index({ full: true });
  const indexDuration = performance.now() - indexStart;

  results.push({
    phase: 'Indexing',
    duration: indexDuration,
    filesProcessed: indexStats.filesProcessed,
    chunksCreated: indexStats.chunksCreated,
    throughput: indexStats.filesProcessed / (indexDuration / 1000)
  });

  // 2. 检索阶段
  console.log('📊 Benchmarking retrieval phase...');
  const queries = [
    'how to authenticate user',
    'database connection',
    'error handling',
    'API endpoint',
    'configuration'
  ];

  const retrievalTimes: number[] = [];
  for (const query of queries) {
    const start = performance.now();
    await engine.retrieve(query, { topK: 10 });
    retrievalTimes.push(performance.now() - start);
  }

  const avgRetrieval = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;

  results.push({
    phase: 'Retrieval (avg)',
    duration: avgRetrieval,
    filesProcessed: 0,
    chunksCreated: 0,
    throughput: 1000 / avgRetrieval  // queries/sec
  });

  return results;
}

// 测试不同规模的仓库
async function main() {
  const testRepos = [
    { name: 'Small (100 files)', path: './test-repos/small' },
    { name: 'Medium (1000 files)', path: './test-repos/medium' },
    { name: 'Large (10000 files)', path: './test-repos/large' }
  ];

  console.log('🚀 Starting benchmark suite...\n');

  for (const repo of testRepos) {
    console.log(`\n=== ${repo.name} ===`);
    const results = await runBenchmark(repo.path);
    
    for (const result of results) {
      console.log(`${result.phase}:`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(2)}/sec`);
    }
  }
}

main();
```

**运行基准测试**:
```bash
npm run benchmark

# 输出示例:
# === Small (100 files) ===
# Indexing:
#   Duration: 1234.56ms
#   Files: 100
#   Throughput: 81.02 files/sec
# Retrieval (avg):
#   Duration: 45.23ms
#   Throughput: 22.11 queries/sec
```

### 4.2 检索质量评估 (`scripts/eval.ts`)

虽然没有标注集，可以编写脚本进行"冒烟测试"：
1.  随机抽取几个 chunks。
2.  提取其中的关键词作为 query。
3.  执行检索，检查 topK 中是否包含原 chunk。
4.  计算 Recall@K (自回归测试)。

**实现**:
```typescript
// scripts/eval.ts
import { ContextEngine } from '../src/engine';
import { ChunkDAO } from '../src/storage/chunk-dao';

interface EvalResult {
  query: string;
  expectedChunkId: string;
  foundAtRank: number | null;  // null 表示未找到
  topKIds: string[];
}

async function evaluateRetrieval(
  engine: ContextEngine,
  dao: ChunkDAO,
  K: number = 10
): Promise<{ recall: number; results: EvalResult[] }> {
  // 1. 随机抽取测试 chunks
  const allChunks = await dao.getAll();
  const sampleSize = Math.min(100, allChunks.length);
  const samples = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * allChunks.length);
    samples.push(allChunks[idx]);
  }

  const results: EvalResult[] = [];
  let foundCount = 0;

  for (const chunk of samples) {
    // 2. 从 chunk 中提取查询关键词
    const query = extractKeywords(chunk.text);
    
    // 3. 执行检索
    const retrieved = await engine.retrieve(query, { topK: K });
    const topKIds = parseChunkIds(retrieved);

    // 4. 检查原 chunk 是否在 top-K 中
    const rank = topKIds.indexOf(chunk.id);
    const found = rank !== -1;
    
    if (found) foundCount++;

    results.push({
      query,
      expectedChunkId: chunk.id,
      foundAtRank: found ? rank : null,
      topKIds
    });
  }

  const recall = foundCount / sampleSize;
  return { recall, results };
}

function extractKeywords(text: string): string {
  // 简单策略：提取函数名/类名
  const identifierRegex = /\b([a-z][a-zA-Z0-9]{3,})\b/g;
  const matches = text.match(identifierRegex) || [];
  
  // 去重并取前 3 个
  const unique = Array.from(new Set(matches)).slice(0, 3);
  return unique.join(' ');
}

function parseChunkIds(context: string): string[] {
  // 从格式化的 context 中解析 chunk IDs
  const regex = /FILE: (.+?) \(lines (\d+)-(\d+)\)/g;
  const ids: string[] = [];
  let match;
  
  while ((match = regex.exec(context)) !== null) {
    const [, path, start] = match;
    ids.push(`${path}:${start}`);
  }
  
  return ids;
}

// 运行评估
async function main() {
  const engine = new ContextEngine({ rootPath: './test-repo' });
  const dao = engine.getChunkDAO();

  console.log('🧪 Running retrieval quality evaluation...\n');

  const { recall, results } = await evaluateRetrieval(engine, dao, 10);

  console.log(`\n📊 Results:`);
  console.log(`Recall@10: ${(recall * 100).toFixed(2)}%`);
  console.log(`Total samples: ${results.length}`);
  console.log(`Found: ${results.filter(r => r.foundAtRank !== null).length}`);

  // 输出失败案例
  const failures = results.filter(r => r.foundAtRank === null);
  if (failures.length > 0) {
    console.log(`\n❌ Failed queries (${failures.length}):`);
    failures.slice(0, 5).forEach(f => {
      console.log(`  Query: "${f.query}"`);
      console.log(`  Expected: ${f.expectedChunkId}`);
      console.log(`  Got: ${f.topKIds.slice(0, 3).join(', ')}`);
    });
  }

  // 输出 MRR (Mean Reciprocal Rank)
  const validRanks = results
    .filter(r => r.foundAtRank !== null)
    .map(r => 1 / (r.foundAtRank! + 1));
  const mrr = validRanks.length > 0 
    ? validRanks.reduce((a, b) => a + b, 0) / results.length
    : 0;
  
  console.log(`\nMRR: ${mrr.toFixed(4)}`);
}

main();
```

**预期结果**:
```bash
npm run eval

# 输出示例:
# 🧪 Running retrieval quality evaluation...
#
# 📊 Results:
# Recall@10: 87.50%
# Total samples: 100
# Found: 87
#
# MRR: 0.7234
```

### 4.3 单元测试用例详细清单

**测试框架**: `jest` 或 `vitest`

#### 存储层测试 (`test/storage/`)

```typescript
// test/storage/db.test.ts
describe('DBManager', () => {
  test('应该正确初始化 Schema', async () => {
    const db = new DBManager(':memory:');
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    expect(tables).toContain('files', 'chunks', 'vectors', 'index_meta');
  });

  test('应该支持事务回滚', async () => {
    const db = new DBManager(':memory:');
    const dao = new ChunkDAO(db);
    
    try {
      db.transaction(() => {
        dao.save({ id: 'test', path: 'test.ts', text: 'test' });
        throw new Error('Rollback');
      })();
    } catch (e) {}
    
    const chunk = dao.getById('test');
    expect(chunk).toBeNull();
  });
});

// test/storage/vector-dao.test.ts
describe('VectorDAO', () => {
  test('Float32 序列化不应丢失精度', () => {
    const original = new Float32Array([0.123456789, -0.987654321, 0.5]);
    const b64 = toBase64(original);
    const restored = fromBase64(b64);
    
    for (let i = 0; i < original.length; i++) {
      expect(Math.abs(original[i] - restored[i])).toBeLessThan(1e-6);
    }
  });
});
```

#### 索引层测试 (`test/indexer/`)

```typescript
// test/indexer/ignore-manager.test.ts
describe('IgnoreManager', () => {
  test('应该正确解析 .gitignore', async () => {
    const ig = new IgnoreManager();
    await ig.loadRules('./test-fixtures');
    
    expect(ig.ignores('node_modules/pkg/index.js')).toBe(true);
    expect(ig.ignores('src/index.ts')).toBe(false);
  });

  test('应该强制忽略敏感文件', async () => {
    const ig = new IgnoreManager();
    expect(ig.ignores('.env')).toBe(true);
    expect(ig.ignores('config/private.key')).toBe(true);
  });
});

// test/indexer/chunker.test.ts
describe('ASTChunker', () => {
  test('应该正确切分 TypeScript 文件', async () => {
    const code = `
      function foo() { return 1; }
      function bar() { return 2; }
      class Baz { method() {} }
    `;
    
    const chunker = new ASTChunker();
    const chunks = await chunker.chunk(code, 'typescript');
    
    expect(chunks.length).toBe(3);
    expect(chunks[0].text).toContain('function foo');
    expect(chunks[1].text).toContain('function bar');
    expect(chunks[2].text).toContain('class Baz');
  });
});
```

#### 检索层测试 (`test/retrieval/`)

```typescript
// test/retrieval/bm25.test.ts
describe('BM25Index', () => {
  test('应该正确计算 BM25 分数', () => {
    const index = new BM25Index();
    index.add('doc1', 'getUserById function implementation');
    index.add('doc2', 'getUser helper function');
    
    const results = index.search('getUserById', 2);
    
    expect(results[0].docId).toBe('doc1');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});

// test/retrieval/rrf.test.ts
describe('RRF', () => {
  test('应该正确融合两个排序列表', () => {
    const listA = [
      { docId: 'a', score: 0.9 },
      { docId: 'b', score: 0.5 }
    ];
    const listB = [
      { docId: 'b', score: 0.8 },
      { docId: 'c', score: 0.6 }
    ];
    
    const merged = rrf(listA, listB);
    
    // 'b' 在两个列表中都靠前，应该排第一
    expect(merged[0].docId).toBe('b');
  });
});
```

#### 集成测试 (`test/integration/`)

```typescript
// test/integration/e2e.test.ts
describe('End-to-End', () => {
  test('完整索引-检索流程', async () => {
    const tmpDir = await createTempRepo();
    const engine = new ContextEngine({ rootPath: tmpDir });
    
    // 1. 索引
    await engine.index({ full: true });
    
    // 2. 检索
    const context = await engine.retrieve('authentication', { topK: 5 });
    
    expect(context).toContain('auth');
    
    // 3. 增量更新
    await fs.writeFile(path.join(tmpDir, 'new.ts'), 'export function newFunc() {}');
    await engine.index({ full: false });
    
    const status = await engine.getStatus();
    expect(status.totalFiles).toBeGreaterThan(0);
  });
});
```

**测试覆盖率目标**:
- 行覆盖率: ≥ 80%
- 分支覆盖率: ≥ 70%
- 函数覆盖率: ≥ 85%

---
**下一步**：参考 `08-roadmap-impl.md` 制定详细任务列表。
