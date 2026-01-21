# 实施指南：04-Storage

> 本文档描述 SQLite 数据库 Schema 设计、DAO 层实现以及增量更新的状态管理。

## 1. 数据库初始化

使用 `better-sqlite3`。

### 1.1 Schema 定义 (`src/storage/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  mtime_ms INTEGER,
  size INTEGER,
  hash TEXT,
  indexed_at TEXT
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  path TEXT,
  idx INTEGER,
  text TEXT,
  start_line INTEGER,
  end_line INTEGER,
  chunk_type TEXT,
  symbol_name TEXT,
  chunk_hash TEXT,
  tokens INTEGER
);

CREATE TABLE IF NOT EXISTS vectors (
  id TEXT PRIMARY KEY,
  dim INTEGER,
  b64 TEXT -- float32 array buffer base64 encoded
);

CREATE TABLE IF NOT EXISTS index_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
```

### 1.2 DB 管理类 (`src/storage/db.ts`)

```typescript
import Database from 'better-sqlite3';
import fs from 'fs';

export class DBManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    // 确保目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(SCHEMA_SQL); // 加载上面的 SQL
  }
  
  // 事务支持
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
```

## 2. DAO 层实现

### 2.1 FileDAO
负责文件元数据管理，用于增量检查。

```typescript
export class FileDAO {
  constructor(private db: Database.Database) {}

  upsert(file: FileMeta) { ... }
  getByPath(path: string): FileMeta | undefined { ... }
  delete(path: string) { ... }
  getAllPaths(): string[] { ... } // 用于检测删除的文件
}
```

### 2.2 ChunkDAO
```typescript
export class ChunkDAO {
  saveMany(chunks: Chunk[]) {
    const stmt = this.db.prepare(`INSERT OR REPLACE INTO chunks ...`);
    // 使用事务批量插入
  }
  
  deleteByPath(path: string) { ... }
}
```

### 2.3 VectorDAO
注意 Vectors 的序列化与反序列化。

```typescript
// Float32Array <-> Base64
function toBase64(f32: Float32Array): string {
  return Buffer.from(f32.buffer).toString('base64');
}

function fromBase64(str: string): Float32Array {
  const buf = Buffer.from(str, 'base64');
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}
```

## 3. 增量更新逻辑 (`src/indexer/incremental.ts`)

### 3.1 Hash 计算工具

**推荐算法**: xxHash (高性能) 或 SHA256 (通用)

**依赖**: `xxhash-wasm` (快速) 或内置 `crypto` (通用)

```typescript
// src/utils/hash.ts
import crypto from 'crypto';

// 方案 1: SHA256 (通用，无需额外依赖)
export async function computeHashSHA256(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// 方案 2: xxHash (高性能，需要 xxhash-wasm)
import { xxHash64 } from 'xxhash-wasm';

let xxhash: Awaited<ReturnType<typeof xxHash64>> | null = null;

export async function computeHashXXHash(filePath: string): Promise<string> {
  if (!xxhash) {
    const { h64ToString } = await xxHash64();
    xxhash = h64ToString;
  }
  
  const content = await fs.readFile(filePath);
  return xxhash(content);
}

// 统一接口
export const computeHash = computeHashSHA256; // 默认使用 SHA256
```

**性能对比**:
| 算法 | 速度 | 碰撞概率 | 依赖 |
|------|------|----------|------|
| xxHash64 | 极快 (~10GB/s) | 极低 | xxhash-wasm |
| SHA256 | 快 (~500MB/s) | 极低 | 内置 crypto |
| MD5 | 快 | 较低（不推荐） | 内置 crypto |

### 3.2 变更检测流程
```typescript
export class IncrementalIndexer {
  async diff(currentFiles: string[]): Promise<DiffResult> {
    const changes: DiffResult = { added: [], modified: [], deleted: [] };
    
    // 1. 获取 DB 中所有文件
    const dbFiles = this.fileDAO.getAllPaths();
    const dbFileMap = new Set(dbFiles);
    
    // 2. 遍历当前文件
    for (const file of currentFiles) {
      const stats = await fs.stat(file);
      const fileMeta = this.fileDAO.getByPath(file);
      
      if (!fileMeta) {
        changes.added.push(file);
      } else if (fileMeta.mtime_ms !== stats.mtimeMs || fileMeta.size !== stats.size) {
        // 进一步计算 Hash 确认
        const currentHash = await computeHash(file);
        if (currentHash !== fileMeta.hash) {
          changes.modified.push(file);
        }
      }
      dbFileMap.delete(file);
    }
    
    // 3. 剩余的是已删除文件
    changes.deleted = Array.from(dbFileMap);
    
    return changes;
  }
}
```

### 3.2 事务处理
确保增量更新的原子性。

```typescript
db.transaction(() => {
  // 1. 删除 deleted 文件的数据 (files, chunks, vectors)
  // 2. 处理 added/modified 文件
  //    - 先删除旧数据 (chunks, vectors)
  //    - 插入新数据
  //    - 更新 files 表
});
```

### 3.3 断点续传机制

处理索引过程中的中断（如进程崩溃、用户 Ctrl+C）。

**实现 (`src/indexer/resume.ts`)**:
```typescript
export interface IndexProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string | null;
  startTime: number;
  lastCheckpoint: number;
}

export class ResumeManager {
  private progressFile: string;

  constructor(dbPath: string) {
    this.progressFile = path.join(path.dirname(dbPath), 'index.progress.json');
  }

  // 保存进度
  async saveProgress(progress: IndexProgress) {
    await fs.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
  }

  // 加载进度
  async loadProgress(): Promise<IndexProgress | null> {
    try {
      const content = await fs.readFile(this.progressFile, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  // 清理进度文件
  async clearProgress() {
    try {
      await fs.unlink(this.progressFile);
    } catch (e) {
      // Ignore
    }
  }

  // 检测是否有未完成的索引
  async hasUnfinishedIndex(): Promise<boolean> {
    const progress = await this.loadProgress();
    return progress !== null && progress.processedFiles < progress.totalFiles;
  }
}
```

**集成到索引流程**:
```typescript
// src/indexer/indexer.ts
export class Indexer {
  private resumeManager: ResumeManager;

  async index(files: string[], options: { resume?: boolean } = {}) {
    // 检查是否有未完成的索引
    if (options.resume && await this.resumeManager.hasUnfinishedIndex()) {
      const progress = await this.resumeManager.loadProgress();
      console.log(`📦 Resuming from ${progress!.processedFiles}/${progress!.totalFiles} files`);
      
      // 过滤掉已处理的文件
      const processedSet = new Set(await this.getProcessedFiles());
      files = files.filter(f => !processedSet.has(f));
    }

    const progress: IndexProgress = {
      totalFiles: files.length,
      processedFiles: 0,
      currentFile: null,
      startTime: Date.now(),
      lastCheckpoint: Date.now()
    };

    // 注册中断处理
    const saveOnExit = async () => {
      await this.resumeManager.saveProgress(progress);
      console.log('\n⚠️  Indexing interrupted. Run with --resume to continue.');
      process.exit(0);
    };

    process.on('SIGINT', saveOnExit);
    process.on('SIGTERM', saveOnExit);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progress.currentFile = file;

        // 处理文件 ...
        await this.processFile(file);

        progress.processedFiles++;

        // 每 10 个文件或每 5 秒保存一次进度
        if (i % 10 === 0 || Date.now() - progress.lastCheckpoint > 5000) {
          await this.resumeManager.saveProgress(progress);
          progress.lastCheckpoint = Date.now();
        }
      }

      // 索引完成，清理进度文件
      await this.resumeManager.clearProgress();
    } finally {
      process.off('SIGINT', saveOnExit);
      process.off('SIGTERM', saveOnExit);
    }
  }

  private async getProcessedFiles(): Promise<string[]> {
    // 从数据库获取已索引的文件列表
    return this.fileDAO.getAllPaths();
  }
}
```

**CLI 使用**:
```bash
# 开始索引
ccq index

# 如果中断，继续索引
ccq index --resume
```

## 4. 验证计划

1.  **Schema 测试**: 验证建表 SQL 无误，索引正确创建。
2.  **CRUD 测试**: 测试 Chunk 和 Vector 的存取，验证 float32 精度是否丢失。
3.  **增量测试**:
    - 索引一次。
    - 修改一个文件，删除一个文件，新增一个文件。
    - 运行 diff 逻辑，验证变更集是否正确。
    - 执行更新，验证 DB 最终状态。

---
**下一步**：参考 `05-api-impl.md` 实现 CLI 和 MCP 接口。
