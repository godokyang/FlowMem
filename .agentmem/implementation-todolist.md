# AI 上下文记忆系统 - 实施 TodoList

> **项目目标：** 实现一套跨工具通用的 AI 上下文记忆系统，使用持久化 Markdown 文件管理 AI 工作记忆。

---

## 阶段一：核心文件模板

### 1.1 创建基础目录结构

- [ ] **TODO-001**: 创建 `.agentmem/` 目录结构模板
  - `.agentmem/project.md` - 项目描述模板（初始版 + 成熟版）
  - `.agentmem/request.md` - 需求澄清模板
  - `.agentmem/todolist.md` - 任务列表模板
  - `.agentmem/notes.md` - 研究笔记模板
  - `.agentmem/docs/` - 详细文档目录
  - `.agentmem/request_detail/` - 需求对话详情目录
  - `.agentmem/history/` - 历史归档目录

### 1.2 文件模板定稿

- [ ] **TODO-002**: 完善 `project.md` 模板
  - 初始版本模板（首次创建使用）
  - 成熟版本模板（经过多次任务积累后）
  - 索引优先原则说明

- [ ] **TODO-003**: 完善 `request.md` 模板
  - 用户原始描述记录区
  - 澄清对话结构（多轮）
  - 需求理解总结区
  - 自检结果区
  - 状态标记

- [ ] **TODO-004**: 完善 `todolist.md` 模板
  - 关联需求
  - 待办事项格式（`[ ]`/`[/]`/`[x]`）
  - 执行日志
  - 遇到的问题记录

- [ ] **TODO-005**: 创建 `deliverable.md` 交付物模板
  - 概述
  - 已完成的改动
  - 验证结果
  - 后续建议

---

## 阶段二：跨工具适配配置

### 2.1 Claude Code 配置

- [ ] **TODO-006**: 创建 Claude Code Skill 配置
  - `.claude/skills/context-memory/SKILL.md`
  - 包含触发条件、工作流、核心规则

### 2.2 Cursor / Windsurf / Trae 配置

- [ ] **TODO-007**: 创建 `.cursorrules` 规则文件
  - 触发条件
  - 工作流定义
  - 文件位置说明
  - 禁止行为

### 2.3 VS Code Copilot 配置

- [ ] **TODO-008**: 创建 `.github/copilot-instructions.md`
  - 项目 AI 协作指南

### 2.4 Antigravity (Gemini) 配置

- [ ] **TODO-009**: 创建 `rules.md` 或 `.gemini/` 配置
  - 全局/项目级规则

### 2.5 Cline / Roo 配置

- [ ] **TODO-010**: 创建 `.clinerules` 或 `.roo/` 配置
  - Memory Bank 适配

---

## 阶段三：自动化工具

### 3.1 初始化脚本

- [ ] **TODO-011**: 创建项目初始化脚本 `init-agentmem.sh`
  - 自动创建 `.agentmem/` 目录结构
  - 复制模板文件
  - 检测项目类型并预填信息

### 3.2 归档脚本

- [ ] **TODO-012**: 创建任务归档脚本 `archive-task.sh`
  - 归档 `request.md` 到 `history/`
  - 归档 `todolist.md` 到 `history/`
  - 清理 `notes.md`
  - 按日期命名

### 3.3 上下文刷新工具

- [ ] **TODO-013**: 创建上下文刷新辅助脚本
  - 快速输出 Todo → Request → Project 内容
  - 支持压缩摘要模式

---

## 阶段四：MCP Server 实现（可选增强）

- [ ] **TODO-014**: 设计 MCP Server API
  - `context_init` - 初始化目录
  - `context_read` - 读取上下文
  - `todo_add` - 添加 Todo
  - `todo_complete` - 标记完成
  - `context_refresh` - 刷新目标

- [ ] **TODO-015**: 实现 MCP Server（Node.js / Python）
  - 工具实现
  - 资源定义（`context://project`, `context://todo`, `context://summary`）

- [ ] **TODO-016**: 编写 MCP Server 安装配置文档

---

## 阶段五：文档与示例

### 5.1 快速开始指南

- [ ] **TODO-017**: 编写 `README.md` 快速开始指南
  - 项目介绍
  - 安装步骤
  - 基本使用流程
  - 常见问题

### 5.2 最佳实践文档

- [ ] **TODO-018**: 编写最佳实践文档 `docs/best-practices.md`
  - 关键规则详解
  - 反模式对照表
  - 错误恢复模式示例

### 5.3 场景示例

- [ ] **TODO-019**: 创建使用场景示例
  - 多文件重构示例
  - 新功能开发示例
  - Bug 调试示例

### 5.4 视频/动图演示

- [ ] **TODO-020**: 制作工作流演示（可选）
  - 完整工作流录屏
  - 关键步骤 GIF 动图

---

## 阶段六：集成与测试

### 6.1 Git 工作流集成

- [ ] **TODO-021**: 设计 Git 集成方案
  - `.gitignore` 配置（哪些需要提交，哪些忽略）
  - 协作场景处理
  - 分支策略建议

### 6.2 测试验证

- [ ] **TODO-022**: 在实际项目中测试
  - 选择 1-2 个项目进行实际测试
  - 记录问题与优化点

- [ ] **TODO-023**: 收集反馈并迭代
  - 根据测试结果优化模板
  - 更新文档

---

## 待完善事项（来自设计文档）

- [ ] 各工具的完整配置文件示例
- [ ] MCP Server 的具体实现代码
- [ ] 自动化初始化脚本
- [ ] 与 Git 工作流的集成方案
- [ ] 多人协作场景的处理

---

## 优先级建议

| 优先级 | TodoList 项 | 原因 |
|--------|-------------|------|
| 🔴 P0 | TODO-001 ~ TODO-005 | 核心文件模板是整个系统的基础 |
| 🟠 P1 | TODO-006 ~ TODO-010 | 跨工具适配使系统真正可用 |
| 🟡 P2 | TODO-011 ~ TODO-013 | 自动化工具提升效率 |
| 🟢 P3 | TODO-014 ~ TODO-016 | MCP Server 是可选增强 |
| 🔵 P4 | TODO-017 ~ TODO-020 | 文档完善提升可维护性 |
| ⚪ P5 | TODO-021 ~ TODO-023 | 集成测试确保稳定性 |

---

## 执行状态跟踪

| 阶段 | 进度 | 备注 |
|------|------|------|
| 阶段一：核心文件模板 | 5/5 ✅ | templates/ 目录 |
| 阶段二：跨工具适配 | 5/5 ✅ | adapters/ 目录 |
| 阶段三：自动化工具 | 3/3 ✅ | scripts/ 目录 |
| 阶段四：MCP Server | 0/3 ⏭️ | 可选，暂时跳过 |
| 阶段五：文档与示例 | 2/4 | README.md + best-practices.md |
| 阶段六：集成与测试 | 0/3 | 待实际项目测试 |

---

*最后更新: 2026-01-08*
