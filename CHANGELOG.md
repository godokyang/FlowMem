# Changelog

All notable changes to FlowMem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
