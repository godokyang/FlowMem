# FlowMem v2 设计

> 版本 2.0 重大改进：审核机制 + npm 包分发 + 规则精简

## 设计文档

- [design.md](./design.md) - 完整设计文档
- [implementation.md](./implementation.md) - 实施文档

## 核心改进

### 1. 审核机制
- **内置审核**（默认）：Prompt 检查点 + CLI 命令
- **LLM 审核**（可选）：语义级判断

### 2. npm 包分发
```bash
npx flowmem init
```

### 3. 规则精简
- 删除冗余示例
- 依赖 CLI 自动检查
- 279 行 → ~180 行
