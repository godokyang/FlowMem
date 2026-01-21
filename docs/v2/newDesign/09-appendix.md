# 附录

## 1. 配置文件示例 (.ccq/config.yaml)

```yaml
# === 语言支持 ===
languages:
  # Tier 1：优先支持，默认启用
  tier1:
    - typescript
    - javascript
    - python
    - go
    - rust
    - java
  # Tier 2：按需加载 parser
  tier2:
    - cpp
    - c
    - csharp
    - ruby
    - php
    - kotlin
    - swift
  # Tier 3：社区 parser
  tier3:
    - bash
    - sql
    - scala
    - lua
    - haskell
    - ocaml

# === 模式选择 ===
mode: hybrid  # full_auto | hybrid | manual_only

# hybrid 模式配置
hybrid:
  project_md:
    enabled: true
    path: .agentmem/project.md
    max_lines: 50           # 限制 project.md 行数
    auto_include: true      # 检索结果自动包含 project.md
  agents_md:
    enabled: false          # 可选：启用 AGENTS.md 跨工具兼容
    path: AGENTS.md

# === 索引配置 ===
index:
  ignore:
    - .gitignore
    - .augmentignore
  maxFileSize: 1MB
  # 语言特定配置
  language_overrides:
    python:
      include_docstrings: true
    go:
      include_comments: true
    rust:
      include_doc_comments: true

# === Chunk 配置 ===
chunker:
  astEnabled: true
  fallback:
    maxChars: 1500
    overlap: 200
  # 超长定义二次切分阈值
  maxChunkSize: 2000

# === Embeddings 配置 ===
embeddings:
  mode: offline  # offline | online
  offline:
    model: Xenova/all-MiniLM-L6-v2
  online:
    url: https://api.example.com/embeddings
    headers:
      Authorization: "Bearer ${ENV:API_KEY}"
    batchSize: 32
    normalize: true

# === 检索配置 ===
retrieval:
  topK: 10
  maxChars: 8000
  rrf:
    k: 60
  # 高级：searchAndAsk（V1.5+）
  ask:
    enabled: true
    # LLM Provider 配置
    provider: openai  # openai | anthropic | ollama | custom
    model: gpt-4o-mini
    apiBaseUrl: https://api.openai.com/v1  # 可选：自定义 API 地址
    apiKeyEnv: OPENAI_API_KEY              # 环境变量名
    timeout: 30s
    maxTokens: 1000

# === 状态持久化 ===
state:
  export_path: .ccq/state.json
  auto_export: true     # 索引完成后自动导出
  compression: true     # 压缩导出文件
```

---

## 2. 常见问题 (FAQ)

**Q: 首次索引很慢怎么办？**
A: 确保 `.gitignore` 正确排除 `node_modules` 等大目录。使用 `ccq status` 检查索引统计。

**Q: 检索结果不准确？**
A: 尝试更具体的查询词。精确符号名用 BM25 效果更好，描述性问题用语义检索。

**Q: 如何与 IDE 的代码搜索配合？**
A: ccq-engine 适合语义理解和跨文件关联；IDE 搜索适合精确文本匹配。两者互补。
