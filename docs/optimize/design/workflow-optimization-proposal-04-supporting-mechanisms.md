# FlowMem Workflow 优化方案 v2.7 - 辅助机制

## 四、辅助机制

### 4.1 MCP/写入拦截器（升级版）

防止 AI 绕过规则：

```typescript
function isProtected(path: string): boolean {
  return [
    ".agentmem/request.md",
    ".agentmem/todolist.md",
    ".agentmem/project.md"
  ].some((protectedPath) => path.endsWith(protectedPath));
}

// 写入层统一拦截，禁止绕过
if (isProtected(filePath) && !viaFlowmemCli()) {
  throw new Error("受保护文件禁止直接写入，请使用 flowmem CLI");
}
```

### 4.2 Git Pre-commit Hook

```bash
#!/bin/bash
flowmem audit pre-commit || exit 1
```

### 4.3 决策日志

记录每个阶段的决策理由，保存在 `.agentmem/logs/`。

---
