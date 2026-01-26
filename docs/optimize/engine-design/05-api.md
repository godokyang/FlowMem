# API 设计

## 1. CLI 命令

### 1.1 核心命令

```bash
# 索引（增量）
ccq index [--full]              # --full 强制全量重建

# 检索上下文
ccq context <query> [options]
  --topK N                      # 返回 top N chunks（默认 10）
  --maxChars M                  # 最大字符数限制（默认 8000）
  --format json|text            # 输出格式（默认 text）

# 问答（需在线 LLM）
ccq ask <question>              # 先检索再调用在线 LLM

# 启动 MCP Server
ccq mcp                         # stdio 模式

# 索引状态
ccq status                      # 查看索引统计
```

### 1.2 高级命令（V1.5+）

#### 状态持久化

支持导出/导入索引状态（类似 Augment SDK），避免重复 embedding 计算：

```bash
# 导出当前索引状态
ccq export ./backup/ccq-state.json

# 导入索引状态（避免重新 embedding）
ccq import ./backup/ccq-state.json

# 检查状态文件有效性
ccq import --dry-run ./backup/ccq-state.json
```

**应用场景**：

| 场景 | 命令 |
|------|------|
| **CI/CD 缓存** | `ccq export` + 缓存 `.ccq/` 目录 |
| **团队共享索引** | 导出后上传到共享存储 |
| **机器迁移** | 导出后在新机器导入 |

#### Direct Context（V2）

索引任意来源的文件（不限于本地磁盘）：

```bash
# 从 URL 添加文件
ccq add-remote https://raw.githubusercontent.com/owner/repo/main/README.md

# 从 stdin 添加
cat api-docs.md | ccq add-stdin --path docs/api.md
```

---

## 2. MCP 工具

暴露三个核心工具供 Host 调用：

### 2.1 codebase_retrieval

代码库语义检索（只读）。

```typescript
codebase_retrieval({
  query: string,
  topK?: number,      // 默认 10
  maxChars?: number,  // 默认 8000
  filter?: {
    path?: string,    // 路径前缀过滤
    type?: string     // chunk 类型过滤 (func/class/text)
  }
}) -> text
```

### 2.2 codebase_ask (V1.5+)

一站式问答模式（需配置在线 LLM）。

```typescript
codebase_ask({
  query: string,
  prompt?: string,       // 自定义 system prompt
  model?: string,        // 可选模型（默认配置文件指定）
  maxChars?: number      // 默认 8000
}) -> text
```

### 2.3 codebase_status

获取当前索引状态（只读）。

```typescript
codebase_status() -> {
  totalFiles: number,
  totalChunks: number,
  lastIndexed: string,
  indexSize: string,
  status: "ready" | "indexing" | "failed"
}
```

**设计原则**：
- **只读安全**：工具不会对文件系统进行写入。
- **LLM 友好**：输出为 text content，便于各类 host 直接注入到模型上下文。
- **开箱即用**：参数有合理默认值，Host 只需传 query 即可。

---

**相关文档**：
- [00-overview.md](./00-overview.md) - 概述
- [06-integration.md](./06-integration.md) - 集成指南
