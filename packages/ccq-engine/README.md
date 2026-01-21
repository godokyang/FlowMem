# @ccq/engine

代码库上下文查询引擎 - Semantic search with AST-aware chunking

## 特性

- ✅ AST 感知的代码切分（基于 Tree-sitter）
- ✅ 混合检索（BM25 + Vector + RRF）
- ✅ SQLite 持久化存储
- ✅ 支持 TypeScript、Python、Go、Rust
- ✅ MCP Server 集成

## 安装

\`\`\`bash
npm install @ccq/engine
\`\`\`

## 使用

\`\`\`typescript
import { ContextEngine } from '@ccq/engine';
import { ConfigLoader } from '@ccq/engine';

const config = ConfigLoader.load(process.cwd());
const engine = new ContextEngine(config);

await engine.index();
const context = await engine.retrieve('user authentication');
console.log(context);
\`\`\`

## CLI

\`\`\`bash
# 索引代码库
ccq index

# 语义搜索
ccq context "如何处理用户认证"

# AI 问答
ccq ask "这个项目的架构是什么？"

# 查看状态
ccq status

# MCP 模式
ccq-mcp
\`\`\`
