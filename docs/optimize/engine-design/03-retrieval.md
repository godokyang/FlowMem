# 检索设计

## 1. Embeddings Provider（离线/在线）

- **离线默认**：Transformers.js feature-extraction pipeline，模型 `Xenova/all-MiniLM-L6-v2`。
- **在线**：可配置 HTTP Provider：
  - request：method/url/headers/bodyTemplate
  - response：JSON Pointer 定位 vectors/text
  - env：`${ENV:KEY}`

**设计要点**：
- 对 embeddings 结果做 normalize（离线已 normalize；在线可加可选 normalize）。
- 支持 batch（batchSize），避免单条请求过慢。

## 2. BM25 索引

- 采用**代码感知 tokenizer**：
  - 按非字母数字/下划线分隔
  - camelCase 分裂：`getUserById` → `get`, `User`, `By`, `Id`
  - snake_case 分裂：`get_user_by_id` → `get`, `user`, `by`, `id`
  - 保留原始 token：`getUserById` 也作为完整 token 保留

- BM25 适合精确词匹配：符号名、错误码、配置键。

## 3. Rank Fusion（RRF）

- **输入**：BM25 排名列表、Vector 排名列表。
- **输出**：融合后的 docId 排名。
- **算法**：`score = 1 / (k + rank)`。
- **参数配置**：
  - `k`: 60 (标准常数)
  - `weights`: 可配置权重 (默认 1.0)
    - `vector_weight`: 语义检索权重
    - `bm25_weight`: 关键词检索权重

## 4. Context Packer（LLM-ready 输出）

输出格式设计为 LLM 易读的结构，并使用 **Tokenizer** (如 tiktoken) 进行精确计数，防止 Context Window 溢出。

```
=== FILE: path/to/file.ts (lines 42-78) ===
CHUNK: func:getUserById
---
export async function getUserById(id: string): Promise<User> {
  const user = await db.users.findOne({ id });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

=== FILE: path/to/service.ts (lines 15-32) ===
CHUNK: class:UserService
---
export class UserService {
  constructor(private db: Database) {}
  
  async getUser(id: string) {
    return this.db.users.findOne({ id });
  }
}
```

**元数据包含**：
- 文件路径
- 行号范围（startLine - endLine）
- Chunk 类型标识（func/class/section/text）
- 可选：相关性分数（调试模式）

---

**相关文档**：
- [02-indexing.md](./02-indexing.md) - 索引设计
- [04-storage.md](./04-storage.md) - 存储设计
- [05-api.md](./05-api.md) - API 设计
