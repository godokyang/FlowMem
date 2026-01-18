# FlowMem v2 实施文档

> 详细任务分解和执行步骤

## 实施概览

| 版本 | 主要内容 | 预计工作量 |
|------|----------|------------|
| v1.0.0 | npm 包基础 + 审核命令 | 3-4 天 |
| v1.1.0 | 升级/状态命令 | 1-2 天 |
| v2.0.0 | LLM 审核（可选） | 2-3 天 |

---

## v1.0.0 实施任务

### 任务 1：项目结构重构

**目标**：将项目重构为 npm 包结构

```
flowmem/                        # 根目录重命名
├── package.json                # 新增
├── bin/
│   └── flowmem.js              # CLI 入口
├── src/
│   ├── index.js
│   ├── cli.js
│   ├── commands/
│   │   ├── init.js
│   │   ├── audit.js
│   │   ├── upgrade.js          # v1.1.0
│   │   └── status.js           # v1.1.0
│   └── utils/
│       ├── detect-adapter.js
│       ├── file-ops.js
│       └── checks.js           # 审核检查逻辑
├── adapters/                   # 自动生成（见下方说明）
├── templates/                  # 保留
├── scripts/                    # 保留
└── docs/
```

> 💡 **适配器生成机制**：`adapters/` 目录由构建脚本自动生成，**不需要手动维护每个适配器**。
>
> ```
> adapters/common-rules.md (唯一模板)
>        ↓
>    npm run build (执行 build-adapters.sh)
>        ↓
> adapters/cursor/、adapters/claude-code/、... (自动生成)
> ```
>
> 只需维护 `adapters/common-rules.md` 模板，脚本会自动替换占位符并生成各适配器。

**步骤**：
- [ ] 创建 `package.json`
- [ ] 创建 `bin/flowmem.js`
- [ ] 创建 `src/cli.js`（使用 commander）
- [ ] 将 `dist/` 重命名为 `adapters/`
- [ ] 更新 `build-adapters.sh` 适配新目录结构
- [ ] 更新 `.gitignore`

---

### 任务 2：实现 init 命令

**文件**：`src/commands/init.js`

**功能**：
1. 自动检测编辑器
2. 复制对应适配器文件
3. 创建 `.agentmem/` 目录（可选）

**接口**：
```bash
flowmem init [options]
  -a, --adapter <name>    指定适配器 (cursor|windsurf|claude-code|...)
  -f, --force             强制覆盖
  -g, --global            全局安装
  --skip-agentmem         不创建 .agentmem/
  --with-mcp              启用 LLM 审核
```

**实现步骤**：
- [ ] 实现 `detectAdapter()` 函数
- [ ] 实现文件复制逻辑（根据适配器类型）
- [ ] 实现 `.agentmem/` 初始化
- [ ] 添加进度输出（emoji + chalk）
- [ ] 处理 `--force` 覆盖逻辑
- [ ] 处理 `--global` 全局路径

**检测逻辑**：
```javascript
// src/utils/detect-adapter.js
const MARKERS = [
  { marker: '.cursor', adapter: 'cursor' },
  { marker: '.cursorrules', adapter: 'cursor' },
  { marker: '.claude', adapter: 'claude-code' },
  { marker: '.windsurf', adapter: 'windsurf' },
  { marker: '.windsurfrules', adapter: 'windsurf' },
  { marker: '.github/copilot-instructions.md', adapter: 'copilot' },
  { marker: '.cline', adapter: 'cline' },
  { marker: '.clinerules', adapter: 'cline' },
  { marker: '.trae', adapter: 'trae' },
];
```

---

### 任务 3：实现 audit 命令

**文件**：`src/commands/audit.js`

**功能**：运行 10 个审核检查项

**接口**：
```bash
flowmem audit [check]     # 运行指定检查或全部
flowmem audit debt        # 仅检查债务
flowmem audit sync        # 仅检查文档同步
flowmem audit --json      # JSON 输出
```

**10 个检查项实现**：

| 检查项 | 文件 | 实现逻辑 |
|--------|------|----------|
| `debt` | checks.js | 统计 task_logs 中 read/write 比例 |
| `sync` | checks.js | 比较 request.md mtime vs 用户回复时间 |
| `project` | checks.js | project.md 是否在任务期间更新 |
| `size` | checks.js | project.md 行数 ≤ 300 |
| `request-size` | checks.js | request.md 行数 ≤ 150，轮次 ≤ 5 |
| `todo` | checks.js | 解析 todolist.md 状态 |
| `active` | checks.js | 检测 request.md/todolist.md 是否存在 |
| `confirmed` | checks.js | request.md 中是否有"已确认" |
| `archive` | checks.js | 任务周期文件是否存在 |
| `structure` | checks.js | .agentmem/ 目录结构是否完整 |

**实现步骤**：
- [ ] 创建 `src/utils/checks.js`
- [ ] 实现 10 个检查函数
- [ ] 实现输出格式化（表格/emoji）
- [ ] 实现 `--json` 输出
- [ ] 实现单项检查 `audit <check>`

---

### 任务 4：更新 common-rules.md

**目标**：精简规则文档，加入审核工具说明

**修改内容**：

1. **删除**（约 55 行）：
   - 规则5 违规/正确流程示例
   - 文件详解表格（合并到核心文件）
   - AI 自检清单
   - 部分反模式对照

2. **新增**（约 30 行）：
   - 检查点协议
   - 审核工具说明

3. **精简**：
   - 7 条规则删除详细示例
   - 反模式对照保留 3-4 条

**实现步骤**：
- [ ] 备份当前 `adapters/common-rules.md`
- [ ] 删除冗余内容
- [ ] 添加检查点协议章节
- [ ] 添加审核工具章节
- [ ] 更新 `build-adapters.sh` 生成新版本

---

### 任务 5：测试和发布

**测试清单**：
- [ ] `npx flowmem init` 在空目录
- [ ] `npx flowmem init --adapter cursor`
- [ ] `npx flowmem init --force` 覆盖
- [ ] `npx flowmem audit` 完整检查
- [ ] `npx flowmem audit debt` 单项检查
- [ ] 所有 7 个适配器测试

**发布步骤**：
```bash
# 1. 更新版本
npm version 1.0.0

# 2. 构建
npm run build

# 3. 测试
npm test

# 4. 发布（首次）
npm publish --access public
```

---

## v1.1.0 实施任务

### 任务 6：实现 upgrade 命令

**文件**：`src/commands/upgrade.js`

**功能**：
1. 检查 npm registry 最新版本
2. 下载并更新 `.flowmem/` 和规则文件
3. 保留用户数据 `.agentmem/`

**实现步骤**：
- [ ] 实现版本检查逻辑
- [ ] 实现文件更新逻辑（保留 .agentmem）
- [ ] 实现回滚机制（备份旧版本）

---

### 任务 7：实现 status 命令

**文件**：`src/commands/status.js`

**功能**：
1. 显示当前适配器和版本
2. 显示 `.agentmem/` 状态
3. 显示活动任务状态

**实现步骤**：
- [ ] 实现版本读取
- [ ] 实现文件状态读取
- [ ] 实现格式化输出

---

### 任务 8：自定义配置

**文件**：`.agentmem/config.yaml`

**功能**：
- 自定义阈值（debt_max、project_max_lines）
- 启用/禁用特定检查
- LLM 审核配置

**实现步骤**：
- [ ] 设计配置文件格式
- [ ] 实现配置加载逻辑
- [ ] 更新 audit 命令使用配置

---

## v2.0.0 实施任务

### 任务 9：MCP Server 开发

**目标**：开发可选的 LLM 审核服务

**架构**：
```
@flowmem/mcp-server/
├── package.json
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── audit-action.ts
│   │   └── validate-checkpoint.ts
│   └── llm/
│       └── client.ts
└── README.md
```

**实现步骤**：
- [ ] 创建独立 npm 包 `@flowmem/mcp-server`
- [ ] 实现 MCP Tools
- [ ] 实现 LLM 调用（多 provider 支持）
- [ ] 集成到主包（可选依赖）

---

## 文件清单

### 新增文件

| 文件 | 用途 |
|------|------|
| `package.json` | npm 包配置 |
| `bin/flowmem.js` | CLI 入口 |
| `src/cli.js` | CLI 逻辑 |
| `src/commands/init.js` | init 命令 |
| `src/commands/audit.js` | audit 命令 |
| `src/commands/upgrade.js` | upgrade 命令（v1.1.0） |
| `src/commands/status.js` | status 命令（v1.1.0） |
| `src/utils/detect-adapter.js` | 编辑器检测 |
| `src/utils/checks.js` | 审核检查逻辑 |
| `src/utils/file-ops.js` | 文件操作工具 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `adapters/common-rules.md` | 精简 + 新增审核工具 |
| `scripts/build-adapters.sh` | 适配新目录结构 |
| `scripts/init-agentmem.sh` | 废弃，功能迁移到 CLI `init` 命令 |
| `scripts/archive-task.sh` | 检查是否需要更新以适配新规则 |
| `scripts/refresh-context.sh` | 检查是否需要更新以适配新规则 |
| `scripts/setup.sh` | 检查是否需要更新以适配新规则 |
| `.gitignore` | 添加 node_modules 等 |

### 需要更新的示例

| 目录 | 更新内容 |
|------|----------|
| `examples/01-new-feature/.agentmem/` | 更新示例文件以反映新规则 |
| `examples/02-refactor/.agentmem/` | 更新示例文件以反映新规则 |
| `examples/03-debug/.agentmem/` | 更新示例文件以反映新规则 |

> 💡 **示例更新原则**：确保示例中的 `project.md`、`request.md` 等文件符合最新规则格式，并演示检查点协议的使用。

### 废弃/迁移

| 变更 | 说明 |
|------|------|
| `dist/` → `adapters/` | 目录重命名 |
| `scripts/init-agentmem.sh` | 功能迁移到 `flowmem init` CLI 命令 |

---

## 验收标准

### v1.0.0

- [ ] `npx flowmem init` 成功安装到项目
- [ ] `npx flowmem audit` 输出 10 项检查结果
- [ ] 规则文档精简到 ~180 行
- [ ] 所有 7 个适配器正常工作
- [ ] npm publish 成功

### v1.1.0

- [ ] `npx flowmem upgrade` 正确升级
- [ ] `npx flowmem status` 显示完整状态
- [ ] 支持 config.yaml 自定义配置

### v2.0.0

- [ ] MCP Server 可独立安装
- [ ] LLM 审核在 Claude Code 中工作
- [ ] 支持多种 LLM 提供商
