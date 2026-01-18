# Changelog

All notable changes to FlowMem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-01-18

### Added
- **TodoList YAML Frontmatter 增强**:
  - YAML Frontmatter 格式（机器友好 + 人类可读）
  - 4 种状态管理：pending / in_progress / completed / cancelled
  - 3 级优先级：high / medium / low
  - 依赖关系管理 + 高级循环依赖检测（DFS 算法）
  - 标准化时间格式：5m / 1h / 2d
  - 自动进度条（实时更新到文件顶部）
- **flowmem todo 命令**:
  - `flowmem todo list` - 列出所有任务（按阶段分组）
  - `flowmem todo stats` - 查看进度统计（含进度条）
  - `flowmem todo add` - 交互式添加任务
  - `flowmem todo update` - 交互式更新任务
- **新增 audit 检查项**:
  - `dependency-check` - 依赖关系验证 + 循环依赖检测
  - `time-format` - 时间格式验证（5m/1h/2d）
- **TodoList 规范文档**: 在 common-rules.md 中新增完整章节

### Changed
- `todolist.md` 格式从传统 Markdown 升级到 YAML Frontmatter
- 规则文档从 188 行增加到 197 行（新增 TodoList 规范）
- 审核检查项从 10 个增加到 12 个

### Added Dependencies
- `js-yaml`: ^4.1.0 - YAML 解析
- `inquirer`: ^8.2.6 - 交互式命令行

### Testing
- 新增 56 个测试用例（全部通过）
- 测试覆盖率：83.22%（超过 80% 目标）
- 单元测试：todo-parser、循环依赖检测、时间格式验证
- 集成测试：flowmem todo 命令完整流程

## [1.0.0] - 2026-01-18

### Added
- **CLI 工具**: 新增 `flowmem` CLI 命令
  - `flowmem init`: 一键初始化到项目
  - `flowmem audit`: 运行 10 个审核检查项
  - 自动检测编辑器适配器
  - 支持 `--force`, `--global`, `--with-mcp` 参数
- **审核机制**: 10 个自动检查项
  - debt（债务计数）
  - sync（request 同步）
  - project（project 更新）
  - size（project 膨胀）
  - request-size（request 膨胀）
  - todo（todolist 状态）
  - active（活动任务检测）
  - confirmed（request 确认）
  - archive（归档完整性）
  - structure（结构完整性）
- **检查点协议**: AI 执行关键操作前输出检查点
- **npm 包分发**: 支持 `npx flowmem init` 一键安装

### Changed
- **规则精简**: 从 278 行精简到 188 行（32% 精简）
  - 删除冗余示例和详细说明
  - 保留核心规则和检查点协议
  - 新增审核工具章节
- **目录结构**: `dist/` 重命名为 `adapters/`
- **依赖更新**: chalk 降级到 v4（CommonJS 兼容）

### Fixed
- Claude Code 适配器的 Self-Contained 结构支持
- 适配器文件复制逻辑优化

### Deprecated
- `scripts/init-agentmem.sh` 已废弃，请使用 `flowmem init`

## [0.9.0] - 2025-01-08

### Added
- 初始版本
- 7 个编辑器适配器支持
- 基础规则文档
- 模板和示例
