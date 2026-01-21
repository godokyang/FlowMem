# 实施指南：03-Retrieval

> 本文档描述 Embeddings 生成、BM25 索引构建、RRF 融合算法以及 LLM 上下文打包的实现。

## 1. Embeddings Provider 实现

### 1.1 架构设计
```typescript
interface IEmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
  dim: number; // 维度 (e.g. 384)
}
```

### 1.2 离线 Provider (Transformers.js)
**依赖**: `@xenova/transformers`

```typescript
// src/embeddings/offline-provider.ts
import { pipeline } from '@xenova/transformers';

export class OfflineProvider implements IEmbeddingsProvider {
  private extractor: any;
  public readonly dim = 384;

  async init() {
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data));
    }
    return embeddings;
  }
}
```

### 1.3 在线 Provider (HTTP)

支持多种在线 Embeddings 服务。

**依赖**: `node-fetch` 或原生 `fetch`

#### OpenAI Provider
```typescript
// src/embeddings/openai-provider.ts
export class OpenAIProvider implements IEmbeddingsProvider {
  public readonly dim = 1536; // text-embedding-3-small
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY!;
    this.model = config.model || 'text-embedding-3-small';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}
```

#### 自定义 Provider
```typescript
// src/embeddings/custom-provider.ts
export class CustomProvider implements IEmbeddingsProvider {
  public readonly dim: number;

  constructor(
    private config: {
      endpoint: string;
      headers?: Record<string, string>;
      requestTransform?: (texts: string[]) => any;
      responseTransform?: (data: any) => number[][];
      dim: number;
    }
  ) {
    this.dim = config.dim;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const body = this.config.requestTransform 
      ? this.config.requestTransform(texts)
      : { texts };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return this.config.responseTransform
      ? this.config.responseTransform(data)
      : data.embeddings;
  }
}
```

#### Provider Factory
```typescript
// src/embeddings/provider-factory.ts
export class EmbeddingsProviderFactory {
  static create(config: any): IEmbeddingsProvider {
    switch (config.provider) {
      case 'offline':
        return new OfflineProvider();
      case 'openai':
        return new OpenAIProvider(config.openai);
      case 'custom':
        return new CustomProvider(config.custom);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
```

## 2. BM25 索引实现

### 2.1 代码感知 Tokenizer
分词逻辑需要对驼峰和下划线敏感。

```typescript
// src/retrieval/tokenizer.ts
export function codeTokenize(text: string): string[] {
  // 1. 移除非字母数字
  // 2. 拆分 camelCase: getUserById -> [get, User, By, Id, getUserById]
  // 3. 拆分 snake_case
  // 4. 去重 & 转小写
}
```

### 2.2 内存版 BM25
可以使用 `wink-bm25-text-search` 或手写简化版。为了性能，建议在内存中构建，持久化时序列化为 JSON 或 SQLite。

```typescript
// src/retrieval/bm25.ts
export class BM25Index {
  // map term -> docId -> score
  private index = new Map<string, Map<string, number>>(); 
  private docLengths = new Map<string, number>();
  private avgDocLength = 0;
  private totalDocs = 0;
  
  add(docId: string, text: string) {
    const tokens = codeTokenize(text);
    this.docLengths.set(docId, tokens.length);
    this.totalDocs++;
    
    // 更新词频
    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }
    
    for (const [term, freq] of termFreq) {
      if (!this.index.has(term)) {
        this.index.set(term, new Map());
      }
      this.index.get(term)!.set(docId, freq);
    }
    
    // 更新平均文档长度
    this.avgDocLength = Array.from(this.docLengths.values())
      .reduce((sum, len) => sum + len, 0) / this.totalDocs;
  }

  search(query: string, topK: number = 10): SearchResult[] {
    const queryTokens = codeTokenize(query);
    const scores = new Map<string, number>();
    
    // BM25 参数
    const k1 = 1.5;
    const b = 0.75;
    
    for (const term of queryTokens) {
      const postings = this.index.get(term);
      if (!postings) continue;
      
      const df = postings.size; // 文档频率
      const idf = Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);
      
      for (const [docId, tf] of postings) {
        const docLen = this.docLengths.get(docId)!;
        const normTF = (tf * (k1 + 1)) / 
          (tf + k1 * (1 - b + b * (docLen / this.avgDocLength)));
        
        const score = idf * normTF;
        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }
    
    return Array.from(scores.entries())
      .map(([docId, score]) => ({ docId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
```

### 2.3 BM25 持久化策略

**方案 1: JSON 序列化（适合小型项目）**
```typescript
// src/retrieval/bm25-persistence.ts
export class BM25Persistence {
  // 序列化为 JSON
  serialize(index: BM25Index): string {
    const data = {
      index: Array.from(index['index'].entries()).map(([term, postings]) => [
        term,
        Array.from(postings.entries())
      ]),
      docLengths: Array.from(index['docLengths'].entries()),
      avgDocLength: index['avgDocLength'],
      totalDocs: index['totalDocs']
    };
    return JSON.stringify(data);
  }

  // 从 JSON 恢复
  deserialize(json: string): BM25Index {
    const data = JSON.parse(json);
    const index = new BM25Index();
    
    index['index'] = new Map(
      data.index.map(([term, postings]: any) => [term, new Map(postings)])
    );
    index['docLengths'] = new Map(data.docLengths);
    index['avgDocLength'] = data.avgDocLength;
    index['totalDocs'] = data.totalDocs;
    
    return index;
  }

  // 保存到文件
  async save(index: BM25Index, filePath: string) {
    const json = this.serialize(index);
    await fs.writeFile(filePath, json, 'utf-8');
  }

  // 从文件加载
  async load(filePath: string): Promise<BM25Index> {
    const json = await fs.readFile(filePath, 'utf-8');
    return this.deserialize(json);
  }
}
```

**方案 2: SQLite 存储（适合大型项目）**
```sql
-- 新增 BM25 专用表
CREATE TABLE IF NOT EXISTS bm25_postings (
  term TEXT,
  doc_id TEXT,
  term_freq INTEGER,
  PRIMARY KEY (term, doc_id)
);

CREATE TABLE IF NOT EXISTS bm25_stats (
  doc_id TEXT PRIMARY KEY,
  doc_length INTEGER
);

CREATE INDEX idx_bm25_term ON bm25_postings(term);
```

```typescript
// src/retrieval/bm25-sqlite.ts
export class BM25SQLite {
  constructor(private db: Database.Database) {}

  // 保存索引到数据库
  saveToDB(index: BM25Index) {
    const insertPosting = this.db.prepare(
      'INSERT OR REPLACE INTO bm25_postings (term, doc_id, term_freq) VALUES (?, ?, ?)'
    );
    const insertStats = this.db.prepare(
      'INSERT OR REPLACE INTO bm25_stats (doc_id, doc_length) VALUES (?, ?)'
    );

    this.db.transaction(() => {
      // 清空旧数据
      this.db.exec('DELETE FROM bm25_postings');
      this.db.exec('DELETE FROM bm25_stats');

      // 保存 postings
      for (const [term, postings] of index['index']) {
        for (const [docId, freq] of postings) {
          insertPosting.run(term, docId, freq);
        }
      }

      // 保存文档长度统计
      for (const [docId, length] of index['docLengths']) {
        insertStats.run(docId, length);
      }
    })();
  }

  // 从数据库加载索引
  loadFromDB(): BM25Index {
    const index = new BM25Index();
    
    // 加载 postings
    const postings = this.db.prepare(
      'SELECT term, doc_id, term_freq FROM bm25_postings'
    ).all() as { term: string; doc_id: string; term_freq: number }[];

    for (const { term, doc_id, term_freq } of postings) {
      if (!index['index'].has(term)) {
        index['index'].set(term, new Map());
      }
      index['index'].get(term)!.set(doc_id, term_freq);
    }

    // 加载文档长度
    const stats = this.db.prepare(
      'SELECT doc_id, doc_length FROM bm25_stats'
    ).all() as { doc_id: string; doc_length: number }[];

    for (const { doc_id, doc_length } of stats) {
      index['docLengths'].set(doc_id, doc_length);
    }

    // 计算统计信息
    index['totalDocs'] = index['docLengths'].size;
    index['avgDocLength'] = Array.from(index['docLengths'].values())
      .reduce((sum, len) => sum + len, 0) / index['totalDocs'];

    return index;
  }
}
```

## 3. RRF 融合算法

```typescript
// src/retrieval/rrf.ts
interface SearchResult {
  docId: string;
  score: number;
}

export function rrf(
  listA: SearchResult[], 
  listB: SearchResult[], 
  k = 60,
  weights = { vector: 1.0, bm25: 1.0 }
): SearchResult[] {
  const scores = new Map<string, number>();

  const processList = (list: SearchResult[], weight: number) => {
    list.forEach((item, rank) => {
      const score = weight * (1 / (k + rank + 1));
      scores.set(item.docId, (scores.get(item.docId) || 0) + score);
    });
  };

  processList(listA, weights.bm25);
  processList(listB, weights.vector);

  return Array.from(scores.entries())
    .map(([docId, score]) => ({ docId, score }))
    .sort((a, b) => b.score - a.score);
}
```

## 4. Vector Search 实现

### 4.1 VectorSearcher 类

**实现 (`src/retrieval/vector-searcher.ts`)**:
```typescript
import { VectorDAO } from '../storage/vector-dao';

export interface SearchResult {
  docId: string;
  score: number;
}

export class VectorSearcher {
  private vectors: Map<string, Float32Array> = new Map();

  constructor(private dao: VectorDAO) {}

  // 从数据库加载所有向量到内存
  async loadVectors() {
    const allVectors = await this.dao.getAll();
    for (const { id, vector } of allVectors) {
      this.vectors.set(id, vector);
    }
  }

  // Cosine Similarity 计算
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) throw new Error('Vector dimension mismatch');
    
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Top-K 向量搜索
  search(queryVec: Float32Array, topK: number = 10): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [docId, vec] of this.vectors.entries()) {
      const score = this.cosineSimilarity(queryVec, vec);
      results.push({ docId, score });
    }

    // 按相似度降序排序，取前 K 个
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // 批量搜索（可选优化）
  batchSearch(queryVecs: Float32Array[], topK: number): SearchResult[][] {
    return queryVecs.map(vec => this.search(vec, topK));
  }
}
```

### 4.2 性能优化（可选）

对于大型代码库（10,000+ chunks），可考虑使用近似搜索：
- **HNSW** (Hierarchical Navigable Small World): `hnswlib-node`
- **FAISS** (Facebook AI Similarity Search): `faiss-node`

**HNSW 集成示例**:
```typescript
import { HierarchicalNSW } from 'hnswlib-node';

export class HNSWSearcher {
  private index: HierarchicalNSW;

  async buildIndex(vectors: Float32Array[], dim: number) {
    this.index = new HierarchicalNSW('cosine', dim);
    this.index.initIndex(vectors.length);
    for (let i = 0; i < vectors.length; i++) {
      this.index.addPoint(vectors[i], i);
    }
  }

  search(queryVec: Float32Array, topK: number) {
    return this.index.searchKnn(queryVec, topK);
  }
}
```

## 5. Context Packer 实现

### 5.1 Token 计数
引入 `tiktoken` 防止 context window 溢出。

### 5.2 Packer 逻辑
```typescript
// src/retrieval/context-packer.ts
import { countTokens } from '../utils/tokenizer';

export class ContextPacker {
  pack(chunks: Chunk[], maxTokens: number = 100000): string {
    let result = "";
    let currentTokens = 0;

    for (const chunk of chunks) {
      const header = `=== FILE: ${chunk.path} (lines ${chunk.startLine}-${chunk.endLine}) ===\n`;
      const content = `CHUNK: ${chunk.chunkType}\n---\n${chunk.text}\n\n`;
      const segment = header + content;
      const tokens = countTokens(segment);

      if (currentTokens + tokens > maxTokens) break;
      
      result += segment;
      currentTokens += tokens;
    }
    return result;
  }

  // 带统计信息的打包
  packWithStats(chunks: Chunk[], maxTokens: number) {
    const packed = this.pack(chunks, maxTokens);
    return {
      content: packed,
      chunksUsed: chunks.length,
      totalTokens: countTokens(packed),
      estimatedCost: this.estimateCost(countTokens(packed))
    };
  }

  private estimateCost(tokens: number): number {
    // GPT-4o-mini: $0.15/1M input tokens
    return (tokens / 1_000_000) * 0.15;
  }
}
```

## 5. 验证计划

1.  **Embedding 测试**: 比较两个语义相似句子的 cosine similarity。
2.  **Tokenizer 测试**: 验证 `getUserById` 是否被正确拆分。
3.  **RRF 测试**: 构造两个不同排序的列表，验证融合结果是否合理（两个列表中都靠前的项应该排第一）。
4.  **Context Packer 测试**: 验证输出格式和长度限制。

---
**下一步**：参考 `04-storage-impl.md` 实现 SQLite 存储层。
