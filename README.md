# FlowMem - AI 上下文记忆系统

> 🧠 **像 Manus 一样工作** — 使用持久化的 Markdown 文件作为 AI 的"磁盘上的工作记忆"

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 解决什么问题？

在与 AI 交流复杂任务时，常见的问题包括：

| 问题 | 表现 |
|------|------|
| **易失性记忆** | 上下文重置时，之前的进度和决策会丢失 |
| **目标漂移** | 在多次工具调用后，原始目标容易被遗忘 |
| **信息过载** | 所有内容挤在上下文中，降低性能并增加成本 |
| **工具碎片化** | 不同编辑器/AI 工具的配置方式不同，难以统一 |

**FlowMem** 通过一套跨工具通用的文件系统，让 AI 能够：
- 📝 持久化记录任务进度
- 🎯 随时刷新目标，防止漂移
- 📚 积累项目知识，形成长期记忆

---

## 快速开始

### 1. 初始化项目

```bash
# 克隆仓库
git clone https://github.com/yourname/FlowMem.git

# 在你的项目中初始化
cd /path/to/your/project
/path/to/FlowMem/scripts/init-agentmem.sh
```

### 2. 目录结构

初始化后，你的项目会有以下结构：

```
your-project/
├── .agentmem/                 # AI 系统专用目录
│   ├── project.md             # 项目整体描述（长期维护）
│   ├── request.md             # 当前需求文档（任务周期）
│   ├── todolist.md            # 任务待办列表（任务周期）
│   ├── notes.md               # 研究笔记（可选）
│   ├── docs/                  # 详细文档目录
│   ├── request_detail/        # 需求对话详情
│   └── history/               # 历史版本归档
└── [项目文件...]
```

### 3. 配置你的 AI 工具

运行初始化脚本时，你可以选择你的 AI 工具，通过交互式菜单自动配置。

或者，手动复制通用规则文件 `adapters/common-rules.md`：

| AI 工具 | 目标位置 |
|--------|----------|
| **Cursor** | 项目根目录 `.cursorrules` |
| **Windsurf** | 项目根目录 `.windsurfrules` |
| **Trae** | 项目根目录 `.trae/rules/context-memory.md` |
| **Cline** | 项目根目录 `.clinerules` |
| **Copilot** | 项目根目录 `.github/copilot-instructions.md` |
| **Gemini** | `~/.gemini/` 或项目内文件 |

> **Claude Code 用户**：建议使用初始化脚本。它会自动将通用规则转换为 Claude Skill 格式 (`.claude/skills/context-memory/SKILL.md`)。如果你必须手动配置，请复制 `adapters/common-rules.md` 内容，并在文件开头添加必要的 YAML frontmatter。

---

## 工作流程

```
1. 检查 project.md（如不存在则创建）
       ↓
2. 创建 request.md，多轮澄清需求
       ↓
3. 用户确认后生成 todolist.md
       ↓
4. 单步执行 Todo，刷新上下文
       ↓
5. 任务完成，归档到 history/
```

### 8 条核心规则

1. **先有文档，再有行动** — 复杂任务前先创建/读取 project.md
2. **刷新上下文优先级**: `todolist.md` → `request.md` → `project.md`
3. **需求先澄清，确认再执行** — 拆分阈值：5 轮对话或 150 行
4. **单步执行，及时更新** — 状态标记 `[x]` / `[/]`
5. **存储而非填充** — 长篇内容存文件，上下文只保留路径
6. **知识沉淀** — 通用知识 → `project.md`，临时信息 → `notes.md`
7. **Manus 上下文优化** — 仅追加、稳定前缀、避免过拟合、可逆压缩
8. **任务完成后清理** — 归档到 history/，保留长期知识库

---

## 自动化脚本

### 初始化项目
```bash
./scripts/init-agentmem.sh [项目目录]
```

### 归档任务
```bash
./scripts/archive-task.sh [项目目录] [任务名称]
```

### 刷新上下文
```bash
./scripts/refresh-context.sh [项目目录] [模式]
# 模式: full | summary | todo
```

---

## 文件说明

### 核心文件

| 文件 | 定位 | 生命周期 |
|------|------|----------|
| `project.md` | 项目整体描述 | 长期维护 |
| `request.md` | 当前需求澄清 | 任务周期 |
| `todolist.md` | 任务分解与进度 | 任务周期 |
| `notes.md` | 研究笔记 | 按需使用 |

### 模板文件

所有模板位于 `templates/` 目录：

- `project.md` - 初始版本模板
- `project-mature.md` - 成熟版本模板
- `request.md` - 需求澄清模板
- `todolist.md` - 任务列表模板
- `notes.md` - 研究笔记模板
- `deliverable.md` - 交付物模板

---

## 使用场景

### ✅ 适合使用

- 多文件重构
- 新功能开发
- Bug 调试
- 研究调研
- 多轮迭代的原型开发

### ❌ 不需要使用

- 单文件小改
- 简单问答
- 快速查询
- 3 次工具调用内能完成的任务

---

## Manus 关键数据

| 指标 | 数值 | 说明 |
|------|------|------|
| 每次任务平均工具调用 | ~50 次 | 需要持久化机制防止目标漂移 |
| 输入输出 Token 比 | 100:1 | Agent 是输入密集型 |
| 上下文刷新频率 | 每次决策前 | 在注意力窗口末尾读取计划文件 |

---

## 参考资料

- [Manus 上下文工程原则](https://manus.im/de/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Claude Code Skills 官方文档](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/skills)
- [设计文档](systemSetting/system.md)

---

## 🫡 致谢与碎碎念

这个项目的诞生完全是因为我很菜 —— 当我看到 **[planning-with-files](https://github.com/OthmanAdi/planning-with-files)** 时，虽然大受震撼，但全英文的文档读得我脑壳疼 😫。

于是，我决定用"笨办法"把它翻译成自己能听懂的中文，顺便结合 **Manus** 的"上下文工程"理论，捣鼓出了这套 FlowMem。

所以，FlowMem 本质上是站在巨人肩膀上（或者说是抱着巨人的大腿 🦵）的一次拙劣模仿与本土化改造。如果它对你有用，请把星星 ⭐ 给原作者，我只是个搬运工。

**膜拜对象：**
- **OthmanAdi/planning-with-files**：祖师爷。没有它就没有这回事。
- **Manus AI**：提供了像"注意力操纵"这样听起来很赛博朋克、但其实超好用的核心理论。

---

## 使用场景示例

我们提供了几个典型的真实场景示例，帮助你理解如何使用这套系统：

- **[✨ 新功能开发](examples/01-new-feature/)**：展示如何通过 `request.md` 澄清模糊需求，并拆解为 `todolist.md`。
- **[🔧 代码重构](examples/02-refactor/todolist.md)**：展示如何安全地进行分步重构，追踪架构变更。
- **[🐛 疑难 Debug](examples/03-debug/todolist.md)**：展示如何利用 TodoList 记录排查路径，验证假设。

---

## License

MIT License
