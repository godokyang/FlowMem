# 索引设计

## 1. Ignore 策略

- 默认读取 `.gitignore` + `.augmentignore`。
- 目标：避免索引非源码大目录、构建产物、缓存、二进制。
- `.augmentignore` 推荐模板见 README。

### 1.1 推荐 .augmentignore 模板

```gitignore
# 依赖目录
node_modules/
vendor/
.venv/
__pycache__/

# 构建产物
dist/
build/
out/
.next/
.nuxt/

# 缓存
.cache/
*.log
.DS_Store

# 大文件
*.min.js
*.bundle.js
*.map
*.wasm

# 敏感文件
.env*
*.pem
*.key
```

---

## 2. Chunk 策略（通用多语言）

**V1：AST 优先 + 字符 Fallback**

| 语言类别 | 切分策略 | 边界单元 |
|----------|----------|----------|
| **Tier 1-3 编程语言** | tree-sitter AST | 函数/类/方法/顶层声明 |
| **Markdown** | Heading 分段 | `## / ###` 标题 |
| **JSON/YAML/TOML** | 顶层 key 分块 | 对象/数组边界 |
| **HTML/CSS** | 结构化切分 | 标签/选择器边界 |
| **其他文本** | 字符切分 | maxChars + overlap |

### 2.1 AST 切分通用规则

- 每个**顶层函数/方法声明**为独立 chunk
- 每个**类/结构体/接口定义**为独立 chunk（含方法）
- 每个**模块导出/公开声明**为独立 chunk
- **import/include/use 语句**合并为单独 chunk
- 超长定义（>2000 chars）做二次切分

> **Parser 加载策略 (Lazy Loading)**：
> 为优化启动速度和内存占用，Tree-sitter parser 采用**按需加载**策略。
> 1. Scanner 扫描文件后缀 (e.g. `.rs`)
> 2. 检查对应 Parser 是否已加载
> 3. 若未加载，动态 import 对应 WASM 模块
> 4. 缓存 Parser 实例供后续使用

### 2.2 语言特定边界

| 语言 | 主要边界节点 |
|------|-------------|
| TypeScript/JavaScript | `function_declaration`, `class_declaration`, `export_statement` |
| Python | `function_definition`, `class_definition`, `decorated_definition` |
| Go | `function_declaration`, `method_declaration`, `type_declaration` |
| Rust | `function_item`, `impl_item`, `struct_item`, `enum_item`, `mod_item` |
| Java | `class_declaration`, `method_declaration`, `interface_declaration` |
| C/C++ | `function_definition`, `struct_specifier`, `class_specifier` |
| Ruby | `method`, `class`, `module` |
| PHP | `function_definition`, `class_declaration`, `method_declaration` |

### 2.3 Markdown 切分规则

- 以 `##` 或 `###` 为分割点
- 每个 section 为独立 chunk
- 保留 heading 作为 chunk 元数据

### 2.4 字符切分参数（Fallback）

- `maxChars`: 1500
- `overlap`: 200

---

## 3. Chunk 数据结构

```typescript
interface Chunk {
  id: string;           // path:idx 格式
  path: string;         // 文件路径
  idx: number;          // 在文件中的序号
  text: string;         // chunk 内容
  startLine: number;    // 起始行号
  endLine: number;      // 结束行号
  chunkType: ChunkType; // func/class/section/text
  symbolName?: string;  // 函数名/类名
  chunkHash: string;    // 内容 hash（用于增量复用）
}

type ChunkType = 'func' | 'class' | 'method' | 'section' | 'imports' | 'text';
```

---

**相关文档**：
- [01-architecture.md](./01-architecture.md) - 高层架构
- [03-retrieval.md](./03-retrieval.md) - 检索设计
- [04-storage.md](./04-storage.md) - 存储设计
