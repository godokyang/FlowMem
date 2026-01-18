# FlowMem - AI 上下文记忆系统

> 🧠 **像 Manus 一样工作** — 使用持久化的 Markdown 文件作为 AI 的"磁盘上的工作记忆"

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/flowmem.svg)](https://www.npmjs.com/package/flowmem)
[![Tests](https://img.shields.io/badge/tests-56%20passed-success)](https://github.com/yourname/FlowMem)
[![Coverage](https://img.shields.io/badge/coverage-83.22%25-brightgreen)](https://github.com/yourname/FlowMem)

---

## 🎯 核心问题

在与 AI 协作复杂任务时，你是否遇到过这些问题？

| 问题 | 表现 | FlowMem 解决方案 |
|------|------|-----------------|
| **易失性记忆** | 上下文重置后进度丢失 | 📝 持久化 Markdown 文件 |
| **目标漂移** | 多次工具调用后忘记初衷 | 🎯 request.md 锚定需求 |
| **信息过载** | 上下文拥挤，性能下降 | 📚 分层存储，按需加载 |
| **进度不可见** | 不知道还剩多少工作 | 📊 实时进度条 + 状态管理 |

**FlowMem 让 AI 拥有持久记忆，就像人类使用笔记本一样。**

---

## ✨ 最新功能（v1.1.0）

### 🚀 TodoList YAML Frontmatter 增强

全新的任务管理系统，结合了**机器友好**的 YAML 格式和**人类可读**的 Markdown：

```yaml
---
meta:
  title: "集成 Stripe 支付"
  created: "2024-01-15T10:00:00Z"
todos:
  - id: "TODO-001"
    content: "安装 stripe 依赖包"
    status: "completed"      # ✅ 4 种状态
    priority: "high"          # 🔴 3 级优先级
    estimate: "5m"            # ⏱️ 标准化时间
    dependencies: []          # 🔗 依赖关系
    phase: "基础设施"
  - id: "TODO-002"
    content: "配置环境变量"
    status: "in_progress"
    priority: "high"
    estimate: "10m"
    dependencies: ["TODO-001"]
---

# 任务清单: 集成 Stripe 支付

## 📊 进度统计
```
总任务: 7
已完成: 3 (43%)
进行中: 1 (14%)
待开始: 3 (43%)

[████████░░░░░░░░░░░░] 43%  ← 🎉 自动生成的进度条！
```

**预计总时间**: 3h 50m
```

### 🎛️ 新增 CLI 命令

```bash
# 📋 列出所有任务（按阶段分组）
flowmem todo list

# 📊 查看进度统计（含进度条）
flowmem todo stats

# ➕ 交互式添加新任务
flowmem todo add

# 🔄 交互式更新任务状态
flowmem todo update
```

### 🛡️ 高级验证机制

| 功能 | 说明 | 命令 |
|------|------|------|
| **循环依赖检测** | DFS 算法自动检测任务依赖环 | `flowmem audit dependency-check` |
| **时间格式验证** | 强制标准化格式（5m/1h/2d） | `flowmem audit time-format` |
| **依赖 ID 验证** | 确保依赖任务存在 | `flowmem audit dependency-check` |

---

## 🚀 快速开始（3 步搞定）

### 步骤 1：安装 FlowMem

```bash
# 一键安装到当前项目
npx flowmem init

# 或指定编辑器适配器
npx flowmem init --adapter cursor
npx flowmem init --adapter claude-code
```

**支持的编辑器**：Cursor, Claude Code, Windsurf, GitHub Copilot, Cline, Trae, Gemini

### 步骤 2：AI 自动初始化

安装完成后，AI 会自动：
1. 检测 `.agentmem/` 目录
2. 创建 `project.md`（项目整体描述）
3. 创建 `request.md`（当前需求）
4. 创建 `todolist.md`（任务清单）

### 步骤 3：开始工作

```bash
# 查看当前进度
flowmem todo stats

# 运行审核检查
flowmem audit

# 添加新任务
flowmem todo add
```

---

## 📚 完整 CLI 命令参考

### `flowmem init` - 初始化项目

```bash
flowmem init [选项]

选项:
  -a, --adapter <name>   指定适配器（cursor|claude-code|windsurf等）
  -f, --force            强制覆盖现有文件
  -g, --global           全局安装到用户目录
  --skip-agentmem        不创建 .agentmem/ 运行时目录
  --with-mcp             启用 LLM 审核（实验性）

示例:
  flowmem init                        # 自动检测编辑器
  flowmem init --adapter cursor       # 指定 Cursor
  flowmem init --force                # 强制覆盖
```

### `flowmem todo` - 任务管理 (v1.1.0+)

```bash
flowmem todo <子命令>

子命令:
  list        列出所有任务（按阶段分组，带优先级和状态）
  stats       查看进度统计（含进度条、预计时间）
  add         交互式添加新任务（支持 --content 非交互模式）
  update      交互式更新任务（状态/优先级/依赖）
  get         获取任务详情（JSON，需 --id）
  set         设置任务字段（需 --id，支持 --status/--priority/--estimate）

示例:
  flowmem todo list                   # 查看所有任务
  flowmem todo stats                  # 查看进度统计
  flowmem todo add                    # 交互式添加
  flowmem todo add --content "Task"   # 非交互式添加
  flowmem todo set --id TODO-001 --status completed  # 更新状态
```

**TodoList 特性（v1.1.0）：**
- ✅ **4 种状态**：pending / in_progress / completed / cancelled
- ✅ **3 级优先级**：🔴 high / 🟡 medium / 🟢 low
- ✅ **依赖管理**：防止循环依赖，自动验证
- ✅ **时间预估**：标准化格式（5m / 1h / 2d）
- ✅ **自动进度条**：实时刷新到文件顶部

**AI 如何创建和更新 TodoList：**

超简单！直接用 CLI 命令，无需手动编辑 YAML：

```bash
# 创建 todolist（从模板复制）
cp .flowmem/templates/todolist.md .agentmem/todolist.md

# 查看所有任务
flowmem todo list

# 查看进度
flowmem todo stats

# 更新任务状态
flowmem todo set --id TODO-001 --status completed

# 添加新任务
flowmem todo add --content "任务描述" --priority high --estimate 30m
```

完整命令：`flowmem todo --help`

### `flowmem audit` - 审核检查

```bash
flowmem audit [检查项] [选项]

选项:
  --json                 输出 JSON 格式

检查项（不指定则运行全部 12 项）:
  基础检查:
    debt                   债务计数检查（读取/沉淀比例）
    sync                   request 同步检查
    project                project 更新检查
    size                   project 膨胀检查（≤300 行）
    request-size           request 膨胀检查（≤150 行，≤5 轮）
    structure              结构完整性检查
  
  任务检查:
    todo                   todolist 状态检查
    active                 活动任务检测
    confirmed              request 确认状态
    archive                归档完整性检查
  
  高级检查（v1.1.0+）:
    dependency-check       依赖关系验证 + 循环依赖检测
    time-format            时间格式验证（5m/1h/2d）

示例:
  flowmem audit                       # 运行所有 12 项检查
  flowmem audit dependency-check      # 仅检查依赖关系
  flowmem audit --json                # JSON 输出
```

---

## 🏗️ 目录结构

### 静态资源（只读）

安装后复制到项目的 `.flowmem/` 目录：

```
.flowmem/
├── scripts/           # AI 运行时脚本
├── templates/         # Markdown 模板
├── examples/          # Few-Shot 示例
└── docs/              # 最佳实践文档
```

### 运行时记忆（读写）

AI 自动生成和维护的 `.agentmem/` 目录：

```
.agentmem/
├── project.md         # 项目整体描述（长期维护）
├── request.md         # 当前需求文档（任务周期）
├── todolist.md        # 任务待办列表（YAML 格式，v1.1.0+）
├── notes.md           # 研究笔记（可选）
├── docs/              # 详细文档目录
├── task_logs/         # 执行日志
├── request_detail/    # 需求对话详情
└── history/           # 历史版本归档
```

---

## 📖 使用示例

### 场景 1：新功能开发

```bash
# 1. AI 创建需求文档
.agentmem/request.md 已创建

# 2. 多轮澄清需求
AI: "请确认以下需求理解..."
User: "确认，开始执行"

# 3. 生成任务清单
.agentmem/todolist.md 已创建（YAML 格式）

# 4. 查看进度
$ flowmem todo stats
📊 集成 Stripe 支付
总任务: 7 | 已完成: 3 (43%)
[████████░░░░░░░░░░░░] 43%

# 5. 单步执行，自动更新进度条
AI 完成 TODO-004 后自动刷新进度 → 57%
```

### 场景 2：代码重构

```bash
# 1. AI 读取 project.md 理解架构
债务: 0/3 ✅

# 2. 创建重构计划
todolist.md:
  - [x] 提取 JWT 工具函数
  - [/] 迁移登录逻辑（进行中）
  - [ ] 更新所有引用路径
  - [ ] 运行测试验证

# 3. 检查依赖关系
$ flowmem audit dependency-check
✅ 依赖关系检查通过（无循环依赖）
```

### 场景 3：疑难 Debug

```bash
# 1. 记录假设和验证
notes.md:
  ## 假设 1: EventBus 泄露
  - 验证结果: ✅ 成立
  - 证据: Heap Dump 显示闭包数量异常

# 2. 跟踪排查进度
todolist.md:
  - [x] 分析 Heap Dump
  - [x] 验证假设 1（EventBus 泄露）
  - [/] 修复 SocketManager.ts
  - [ ] 压测验证
```

---

## 🎓 工作流程

```
┌─────────────────────────────────────────────────┐
│ 1. 复杂任务触发 FlowMem                          │
│    - 3+ 文件修改                                 │
│    - 10+ 次工具调用                              │
│    - 用户提到「规划」「分步」                      │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│ 2. AI 读取/创建 project.md                       │
│    - 项目整体架构                                │
│    - 已知的 API/模块                             │
│    - 技术栈和约束                                │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│ 3. 创建 request.md，多轮澄清                     │
│    - 记录原始需求                                │
│    - AI 提出澄清问题                             │
│    - 用户回答后立即更新                           │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│ 4. 用户确认后生成 todolist.md                    │
│    - YAML Frontmatter 格式（v1.1.0+）           │
│    - 自动分配任务 ID                             │
│    - 设置依赖关系                                │
│    - 生成进度条                                  │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│ 5. 单步执行，刷新上下文                          │
│    - 执行 1 个 Todo                              │
│    - 更新状态（pending → in_progress → completed）│
│    - 自动刷新进度条                              │
│    - 读取上下文（todolist → request → project） │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│ 6. 任务完成，归档清理                            │
│    - 归档 request.md → history/20260118_xxx.md  │
│    - 归档 todolist.md → history/                │
│    - 保留 project.md（长期知识）                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 支持的 AI 编辑器

| 编辑器 | 适配器名称 | 自动检测 | 特殊说明 |
|--------|-----------|---------|---------|
| **Cursor** | `cursor` | ✅ `.cursor` 或 `.cursorrules` | 自动加载 |
| **Claude Code** | `claude-code` | ✅ `.claude` | [需激活 Skill](docs/claude-code-setup.md) ⚠️ |
| **Windsurf** | `windsurf` | ✅ `.windsurf` 或 `.windsurfrules` | 自动加载 |
| **GitHub Copilot** | `copilot` | ✅ `.github/copilot-instructions.md` | 自动加载 |
| **Cline (Roo)** | `cline` | ✅ `.cline` 或 `.clinerules` | 自动加载 |
| **Trae** | `trae` | ✅ `.trae` | 自动加载 |
| **Gemini** | `gemini` | - | 自动加载 |

> ⚠️ **Claude Code 用户注意**：需手动激活 Skill 才能生效。在对话中输入 `/skill context-memory-system` 或在项目设置中启用。详见 [Claude Code 使用指南](docs/claude-code-setup.md)。

---

## 📊 核心规则（8 条）

1. **先有文档，再有行动**  
   复杂任务前先创建/读取 `project.md`

2. **刷新上下文优先级**  
   `todolist.md` → `request.md` → `project.md`

3. **需求先澄清，确认再执行**  
   拆分阈值：5 轮对话或 150 行

4. **单步执行，及时更新**  
   状态标记：`[ ]` / `[/]` / `[x]` / `[-]`

5. **存储而非填充**  
   长篇内容存文件，上下文只保留路径

6. **知识沉淀（债务机制）**  
   每读 3 个文件必须沉淀到 `project.md`

7. **Manus 上下文优化**  
   仅追加、稳定前缀、可逆压缩

8. **任务完成后清理**  
   归档到 `history/`，保留长期知识库

---

## 🧪 本地开发与测试

### 安装依赖并链接

```bash
# 1. 克隆仓库
git clone https://github.com/yourname/FlowMem.git
cd FlowMem

# 2. 安装依赖
npm install

# 3. 链接到全局
npm link

# 4. 在测试项目中使用
cd /path/to/test/project
flowmem init --adapter cursor

# 5. 测试命令
flowmem todo stats
flowmem audit
```

### 运行测试套件

```bash
# 运行所有测试（56 个测试用例）
npm test

# 查看测试覆盖率（83.22%）
npm test -- --coverage

# 运行特定测试
npm test -- todo-parser.test.js
```

**测试统计（v1.1.0）：**
- ✅ 56 个测试用例全部通过
- ✅ 测试覆盖率：83.22%
- ✅ 单元测试：todo-parser, 循环依赖检测, 时间验证
- ✅ 集成测试：flowmem todo 命令完整流程

---

## 📈 性能数据（来自 Manus AI）

| 指标 | 数值 | 说明 |
|------|------|------|
| 平均工具调用 | ~50 次/任务 | 需要持久化防止目标漂移 |
| 输入输出比 | 100:1 | Agent 是输入密集型 |
| 上下文刷新频率 | 每次决策前 | 在注意力窗口末尾读取 |

---

## 🎯 适用场景

### ✅ 推荐使用

- 🏗️ **多文件重构**（3+ 文件）
- ✨ **新功能开发**（需求复杂）
- 🐛 **疑难 Bug 调试**（多轮验证）
- 📚 **研究调研**（积累知识）
- 🔄 **多轮迭代原型**（快速试错）

### ❌ 不推荐使用

- 📝 **单文件小改**
- 💬 **简单问答**
- 🔍 **快速查询**
- ⚡ **3 次工具调用内完成的任务**

---

## 📚 参考资料

- 📖 [Manus 上下文工程原则](https://manus.im/de/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- 🔧 [Claude Code Skills 官方文档](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/skills)
- 🌟 [planning-with-files](https://github.com/OthmanAdi/planning-with-files) - 灵感来源

---

## 🙏 致谢

这个项目的诞生完全是因为我很菜 —— 当我看到 **[planning-with-files](https://github.com/OthmanAdi/planning-with-files)** 时，虽然大受震撼，但全英文的文档读得我脑壳疼 😫。

于是，我决定用"笨办法"把它翻译成自己能听懂的中文，顺便结合 **Manus** 的"上下文工程"理论，捣鼓出了这套 FlowMem。

**FlowMem = planning-with-files（灵感）+ Manus（理论）+ 中文本土化**

### 膜拜对象

- **[OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files)** - 祖师爷，没有它就没有这个项目
- **[Manus AI](https://manus.im)** - 提供了"注意力操纵"等核心理论

如果 FlowMem 对你有用，请把星星 ⭐ 给原作者，我只是个搬运工和翻译者。

---

## 📝 更新日志

### v1.1.0 (2026-01-18)

**🎉 TodoList YAML Frontmatter 增强**

- ✅ YAML Frontmatter 格式（机器友好 + 人类可读）
- ✅ 4 种状态管理：pending / in_progress / completed / cancelled
- ✅ 3 级优先级：high / medium / low
- ✅ 依赖关系管理 + 高级循环依赖检测（DFS 算法）
- ✅ 标准化时间格式：5m / 1h / 2d
- ✅ 自动进度条（实时更新到文件顶部）

**🛠️ 新增 CLI 命令**

- `flowmem todo list` - 列出所有任务
- `flowmem todo stats` - 查看进度统计
- `flowmem todo add` - 交互式添加任务
- `flowmem todo update` - 交互式更新任务

**🔍 新增 audit 检查项**

- `dependency-check` - 依赖关系验证 + 循环依赖检测
- `time-format` - 时间格式验证

**📊 测试**

- 56 个测试用例全部通过
- 测试覆盖率：83.22%

### v1.0.0 (2026-01-18)

- ✅ CLI 工具（init / audit）
- ✅ 10 个审核检查项
- ✅ 规则精简（278 行 → 188 行）
- ✅ 7 个编辑器适配器

---

## 📄 License

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
# 1. Fork 仓库
# 2. 创建特性分支
git checkout -b feature/amazing-feature

# 3. 提交更改
git commit -m 'Add amazing feature'

# 4. 推送到分支
git push origin feature/amazing-feature

# 5. 打开 Pull Request
```

---

**如果 FlowMem 帮到了你，请给个 ⭐ Star！**
