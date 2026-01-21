# FlowMem v2 设计文档

> 审核机制 + npm 包分发 + 规则精简

## 目录

1. [问题背景](#问题背景)
2. [设计目标](#设计目标)
3. [审核机制](#审核机制)
4. [npm 包设计](#npm-包设计)
5. [规则精简方案](#规则精简方案)
6. [实施计划](#实施计划)
7. [兼容性](#兼容性)

---

## 问题背景

### 问题 1：AI 违反规则

当前 `common-rules.md` 定义了严格的工作流程规则，但 AI 在实际执行中经常违反：
- 债务 ≥3 后未沉淀知识
- 跳过需求确认直接执行
- 输出 `💡 知识沉淀` 后未实际更新文件
- 违反单步执行原则

### 问题 2：部署繁琐

当前部署方式需要多步手动操作：
```bash
git clone https://github.com/xxx/FlowMem
cd FlowMem
./scripts/build-adapters.sh
cp -r dist/cursor/* ~/my-project/  # 手动复制
```

---

## 设计目标

1. **自动审核**：CLI 工具强制执行规则，减少 AI 违规
2. **一键安装**：`npx flowmem init` 完成部署
3. **规则精简**：删除冗余示例，依赖 CLI 检查
4. **高兼容性**：支持所有 AI 编辑器

---

## 审核机制

### 两层架构

```
┌─────────────────────────────────────────────────────────────┐
│  可选：LLM 审核（语义级，支持 MCP 的编辑器）                 │
│  - 用户自选模型进行语义审核                                  │
│  - 适用：需求澄清质量、批量条件判断等复杂判断                │
├─────────────────────────────────────────────────────────────┤
│  默认：内置审核（Prompt + CLI，所有编辑器通用）              │
│  - Prompt 检查点：AI 输出结构化检查结果                      │
│  - CLI 命令：`flowmem audit` 客观验证                        │
│  - 成本：0                                                   │
└─────────────────────────────────────────────────────────────┘
```

### 检查项

| 检查项 | 对应规则 | 命令 |
|--------|----------|------|
| **债务计数** | 规则5: 知识沉淀 | `flowmem audit debt` |
| **request 同步** | 规则2: 需求澄清 | `flowmem audit sync` |
| **project 更新** | 规则1: 上下文管理 | `flowmem audit project` |
| **project 膨胀** | 规则5: 防膨胀 | `flowmem audit size` |
| **request 膨胀** | 文件详解 | `flowmem audit request-size` |
| **todolist 状态** | 规则3: 执行节奏 | `flowmem audit todo` |
| **活动任务检测** | 任务禁止退出 | `flowmem audit active` |
| **request 确认** | 规则2: 确认再执行 | `flowmem audit confirmed` |
| **归档完整性** | 规则7: 任务清理 | `flowmem audit archive` |
| **结构完整性** | 核心文件 | `flowmem audit structure` |

### Prompt 检查点协议

AI 执行关键操作前必须输出：

```checkpoint
操作: [操作类型]
债务: X/3 → [✅/❌]
同步: [已同步/未同步] → [✅/❌]
判定: [通过/阻塞: 原因]
```

### LLM 审核（可选）

仅需要语义理解的场景：
- 需求澄清质量
- 批量条件判断
- 知识沉淀质量

推荐低成本模型：GPT-4o-mini、Haiku、Gemini Flash、本地模型

---

## npm 包设计

### 目标体验

```bash
# 一条命令完成安装
npx flowmem init

# 指定编辑器
npx flowmem init --adapter cursor
```

### 包结构

```
flowmem/
├── package.json
├── bin/flowmem.js              # CLI 入口
├── src/
│   ├── cli.js
│   └── commands/
│       ├── init.js
│       ├── upgrade.js
│       ├── status.js
│       └── audit.js
├── adapters/                   # 预构建适配器
│   ├── cursor/
│   ├── claude-code/
│   └── ...
└── templates/
```

### CLI 命令

| 命令 | 功能 |
|------|------|
| `flowmem init` | 初始化到当前项目 |
| `flowmem upgrade` | 升级到最新版本 |
| `flowmem status` | 查看当前状态 |
| `flowmem audit` | 运行审核检查 |

### init 命令

```bash
$ npx flowmem init
🔍 检测到当前项目使用: Claude Code
📦 正在安装 FlowMem...
  ✓ 创建 .flowmem/ 目录
  ✓ 生成规则文件
  ✓ 复制模板和脚本
🎉 安装完成！
```

**参数**：
| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--adapter, -a` | 指定适配器 | 自动检测 |
| `--force, -f` | 强制覆盖 | false |
| `--global, -g` | 全局安装 | false |
| `--with-mcp` | 启用 LLM 审核 | false |

### audit 命令

```bash
$ npx flowmem audit
🔍 FlowMem 审核报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 债务检查: 通过 (1/3)
❌ request 同步: 失败
   └─ 用户回复后未更新 request.md
✅ project 大小: 通过 (156 行)
✅ todolist: 通过 (3/5 完成)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> 💡 审核命令由 AI 在任务执行过程中自动调用，用户只需查看结果。

### 自动检测逻辑

```javascript
const ADAPTER_MARKERS = [
  { marker: '.cursor', adapter: 'cursor' },
  { marker: '.claude', adapter: 'claude-code' },
  { marker: '.windsurf', adapter: 'windsurf' },
  { marker: '.github/copilot-instructions.md', adapter: 'copilot' },
  // ...
];

function detectAdapter(projectRoot) {
  for (const { marker, adapter } of ADAPTER_MARKERS) {
    if (fs.existsSync(path.join(projectRoot, marker))) {
      return adapter;
    }
  }
  return 'claude-code';  // 默认
}
```

### package.json

```json
{
  "name": "flowmem",
  "version": "2.0.0",
  "description": "上下文记忆系统 - AI 编辑器持久化工作记忆管理",
  "bin": { "flowmem": "./bin/flowmem.js" },
  "engines": { "node": ">=16.0.0" },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "fs-extra": "^11.2.0"
  }
}
```

### 安装方式

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| npx（推荐） | `npx flowmem init` | 一次性安装 |
| 全局安装 | `npm i -g flowmem` | 频繁使用 |
| 项目依赖 | `npm i -D flowmem` | CI/CD 集成 |

---

## 规则精简方案

有了 CLI 审核工具后，原规则文档可以大幅精简。

### 精简原则

1. **CLI 能检查的规则** → 删除详细示例
2. **重复内容** → 合并
3. **详细示例** → 删除，用户看 CLI 输出理解

### 删除内容

| 内容 | 行数 | 原因 |
|------|------|------|
| 规则5 违规/正确流程示例 | ~20 行 | CLI 自动检查 |
| 文件详解表格 | ~10 行 | 合并到核心文件 |
| AI 自检清单 | ~15 行 | 改为 CLI 命令 |
| 反模式对照（部分） | ~10 行 | 保留核心 3-4 条 |

### 保留内容

- 三秒检查
- 核心文件表格
- 触发判断
- 任务禁止退出
- 整体流程图
- 7 条规则描述（删除示例）
- 检查点协议（新增）
- 审核工具（新增）

### 精简后对比

| 指标 | 当前 | 精简后 |
|------|------|--------|
| 总行数 | 279 行 | ~180 行 |
| 总字节 | 10.5KB | ~7KB |
| AI 理解负担 | 高 | 低 |
| 规则执行保障 | 自律 | CLI 强制 |

### 精简后大纲

```
# 上下文记忆系统规则
> 🛑 三秒检查
## 核心文件
## 触发判断
## 任务进行中禁止退出
## 整体流程
## 🔒 检查点协议（新增）
## 7 条关键规则（删除示例）
## 🔧 审核工具（新增）
## 反模式对照（精简）
```

---

## 实施计划

### v1.0.0：基础功能

1. 实现 `flowmem init` 命令
2. 实现 `flowmem audit` 命令（10 个检查项）
3. 更新 `common-rules.md`，加入检查点协议
4. 精简规则文档

### v1.1.0：完善功能

5. 实现 `flowmem upgrade` 命令
6. 实现 `flowmem status` 命令
7. 支持自定义阈值配置

### v2.0.0：LLM 审核（可选）

8. 开发 MCP Server 作为可选包
9. 支持多种 LLM 提供商

---

## 兼容性

### 编辑器支持

| 编辑器 | 内置审核 | LLM 审核 |
|--------|----------|----------|
| Claude Code | ✅ | ✅ 可选 |
| Cursor | ✅ | ⚠️ 实验性 |
| Windsurf | ✅ | ❌ |
| Copilot | ✅ | ❌ |
| Cline | ✅ | ⚠️ 实验性 |
| Trae | ✅ | ❌ |
| Gemini | ✅ | ❌ |

### 系统要求

- Node.js 16.x+
- macOS / Linux / Windows (WSL)
