# 集成指南

## 1. FlowMem 工作流集成

### 1.1 新工作流

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 复杂任务触发                                                  │
│    - 3+ 文件修改 / 10+ 工具调用 / 用户提到「规划」               │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. AI 按需检索（NEW - 替代读 project.md）                        │
│    - 调用 codebase_retrieval("用户需求相关关键词")               │
│    - 获取相关代码 chunks                                         │
│    - 无需手动维护 project.md                                     │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 创建 request.md，多轮澄清（保留）                             │
│    - 记录原始需求                                                │
│    - AI 提出澄清问题                                             │
│    - 用户回答后立即更新                                          │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. 用户确认后生成 todolist.md（保留）                            │
│    - YAML Frontmatter 格式                                       │
│    - flowmem todo CLI 管理                                       │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. 单步执行，按需检索（NEW - 替代刷新上下文）                    │
│    - 执行 1 个 Todo                                              │
│    - 需要理解代码时调用 codebase_retrieval                       │
│    - 无需"债务机制"，无需手动沉淀                                 │
└─────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. 任务完成，归档（保留）                                        │
│    - 归档 request.md / todolist.md                               │
│    - 无需维护 project.md                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 规则变更

**删除/修改的规则**：

| 旧规则 | 变更 |
|--------|------|
| 规则 1: 必须先读 project.md | **删除** - 改为按需 codebase_retrieval |
| 规则 5: 债务机制 | **删除** - 代码知识自动索引，无需手动沉淀 |
| 规则 6: 刷新上下文顺序 | **简化** - todolist → request（不再强制读 project） |
| 三秒检查: 债务 ≥3? | **删除** |
| 检查点协议: 债务 X/3 | **删除** |

**保留的规则**：

| 规则 | 说明 |
|------|------|
| 规则 2: 需求先澄清 | 保留 request.md 流程 |
| 规则 3: 单步执行 | 保留 todolist 执行节奏 |
| 规则 4: 存储而非填充 | 保留 |
| 规则 7: 任务完成清理 | 保留归档机制 |

**新增的规则**：

```markdown
### 规则 X: 按需检索

**何时检索**：
- 需要理解某模块的实现方式
- 需要找到相关代码位置
- 需要了解某个符号/函数的用法

**如何检索**：
- 直接调用 codebase_retrieval("具体问题或关键词")
- 不需要预先读取任何文件

**不需要检索**：
- 已知具体文件路径 → 直接 Read file
- 简单问答 → 直接回答
```

### 1.3 project.md 的新定位（可选）

project.md 从"必须维护"变为"可选高层摘要"：

```markdown
# [项目名称]

## 一句话描述
[这个项目是什么、为谁解决什么问题]

## 技术栈
- 语言: TypeScript
- 框架: Next.js
- 数据库: PostgreSQL

## 🔗 代码检索
项目代码通过 ccq-engine 自动索引，AI 可直接调用 codebase_retrieval 检索。
无需手动维护模块文档。

## ⚠️ 必读注意事项（人工维护）
- [关键坑点1：需要人工标注的特殊约定]
- [关键坑点2：不在代码里但很重要的信息]
```

### 1.4 AI 使用指引（写入 common-rules.md）

```markdown
## 代码检索 vs 直接读取

| 场景 | 操作 |
|------|------|
| 需要找代码位置 | `codebase_retrieval("关键词")` |
| 需要理解某模块 | `codebase_retrieval("模块名 + 功能描述")` |
| 已知具体路径 | `Read file` |
| 需要修改文件 | `Read file` → `Edit file` |

**示例**：
```
用户: "帮我修改登录逻辑"

AI 操作:
1. codebase_retrieval("登录 login authentication") 
   → 获取相关代码 chunks
2. 根据 chunks 确定具体文件路径
3. Read file 读取完整文件
4. Edit file 修改
```
```

### 1.5 project.md vs 按需检索：如何选择？

ccq-engine **不是要取消 project.md**，而是提供**混合模式**，让用户按需选择。

#### 1.5.1 两种模式对比

| 维度 | project.md（手动知识文件） | 按需检索（ccq-engine） |
|------|---------------------------|------------------------|
| **维护方式** | 人工维护 | 自动索引 |
| **知识类型** | 隐性知识（约定、坑点、决策） | 显性知识（代码结构） |
| **更新频率** | 依赖人工触发 | 随代码自动更新 |
| **上下文消耗** | 全量加载（300 行限制） | 按需检索（topK chunks） |
| **适用规模** | 小项目（<50 文件） | 任意规模 |
| **离线能力** | ✅ 完全离线 | ⚠️ 在线 embedding 可选 |
| **可控性** | ✅ 完全控制 | ⚠️ "黑盒"检索 |
| **跨工具兼容** | ⚠️ 仅 FlowMem | ✅ MCP 标准 |

#### 1.5.2 业界最佳实践

**推荐架构：混合模式**

```
.agentmem/
├── project.md          # 人工维护：高层摘要 + 隐性知识（~50 行）
└── ...

.ccq/
├── index.db            # 自动索引：代码语义
└── config.yaml         # 检索配置

# 可选：跨工具通用指令
AGENTS.md               # 跨 AI 工具的通用标准（Cursor/Claude/Copilot）
```

#### 1.5.3 何时选择哪种模式？

| 场景 | 推荐模式 | 说明 |
|------|----------|------|
| 小项目（<50 文件） | 仅 project.md | 无需 ccq-engine 复杂度 |
| 隐性知识多（架构决策、历史坑） | project.md + ccq-engine | 混合模式 |
| 纯代码项目（隐性知识少） | 仅 ccq-engine | 全自动 |
| 团队协作（多 AI 工具） | AGENTS.md + ccq-engine | 跨工具兼容 |
| 开源项目 | AGENTS.md | 最大化贡献者兼容性 |

---

## 2. Claude Desktop 集成

Claude Desktop 支持本地 MCP server（stdio）并可通过配置文件注册服务；也支持以 Desktop Extensions 的方式安装 MCP server（.mcpb）。

**配置示例（claude_desktop_config.json）**：

```json
{
  "mcpServers": {
    "ccq-engine": {
      "command": "npx",
      "args": ["-y", "@ccq/engine", "mcp"],
      "env": {
        "CCQ_ROOT": "/path/to/project"
      }
    }
  }
}
```

推荐：开发阶段使用手动配置（command + args + env），稳定后再考虑打包成扩展。

---

## 3. GitHub Copilot（VS Code）集成

VS Code 的 Copilot Chat 支持通过 MCP servers 扩展工具与上下文来源，可通过 `.vscode/mcp.json` 配置本地 MCP server；并可通过命令面板查看/管理服务器与工具。

**配置示例（.vscode/mcp.json）**：

```json
{
  "servers": {
    "ccq-engine": {
      "command": "npx",
      "args": ["-y", "@ccq/engine", "mcp"]
    }
  }
}
```

需要注意：企业/组织策略可能禁用 MCP，需要管理员开启相关政策。

---

## 4. 实际命令参考

### 4.1 ccq-workflow 命令

```bash
# 初始化 FlowMem 工作流
flowmem init                           # 自动检测编辑器
flowmem init --adapter cursor          # 指定适配器
flowmem init --with-mcp                # 启用 MCP 集成

# 查看状态
flowmem status

# 运行审核
flowmem audit                          # 运行所有检查
flowmem audit debt                     # 债务检查
flowmem audit workflow                 # 工作流检查
flowmem audit --json                   # JSON 输出

# 管理 TodoList
flowmem todo list                      # 列出所有任务
flowmem todo stats                     # 任务统计
flowmem todo add --content "..." --priority high
flowmem todo update --id 1 --status in_progress
flowmem todo get --id 1
flowmem todo set --id 1 --status completed

# 升级
flowmem upgrade
```

### 4.2 ccq-engine 命令

```bash
# 初始化配置
ccq init

# 索引代码库
ccq index                              # 增量索引
ccq index --full                       # 全量重建
ccq index --watch                      # 监听模式

# 检索上下文
ccq context "如何处理用户认证"           # 语义搜索
ccq context "login" --topK 20          # 指定返回数量
ccq context "auth" --mode hybrid       # 混合模式（默认）
ccq context "jwt" --mode bm25          # 仅关键词
ccq context "user" --mode vector       # 仅向量

# AI 问答
ccq ask "这个项目的架构是什么？"
ccq ask "如何实现登录？" --model gpt-4o

# 查看状态
ccq status

# 状态持久化
ccq export ./backup/state.json         # 导出索引
ccq import ./backup/state.json         # 导入索引

# 远程文件索引（Direct Context）
ccq add-remote https://raw.githubusercontent.com/owner/repo/main/README.md

# 安装 Git Hooks
ccq install-hooks

# 启动 MCP Server
ccq-mcp                                # stdio 模式
```

### 4.3 MCP 工具调用（AI 自动使用）

通过 MCP 集成后，AI 可以自动调用以下工具：

```typescript
// 语义检索
codebase_retrieval({
  query: "用户认证逻辑",
  topK: 10
})

// 问答
codebase_ask({
  question: "这个项目如何处理错误？"
})

// 状态查询
codebase_status()
```

---

**相关文档**：
- [00-overview.md](./00-overview.md) - 概述
- [05-api.md](./05-api.md) - API 设计
