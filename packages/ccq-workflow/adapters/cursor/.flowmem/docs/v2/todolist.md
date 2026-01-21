# FlowMem v2 实施任务清单

## v1.0.0：基础功能（3-4 天）

### 任务 1：项目结构重构
- [ ] 创建 `package.json`
- [ ] 创建 `bin/flowmem.js` CLI 入口
- [ ] 创建 `src/cli.js`（使用 commander）
- [ ] 将 `dist/` 重命名为 `adapters/`
- [ ] 更新 `build-adapters.sh` 适配新目录结构
- [ ] 更新 `.gitignore`（添加 node_modules 等）

### 任务 2：实现 init 命令
- [ ] 创建 `src/commands/init.js`
- [ ] 实现 `src/utils/detect-adapter.js`（编辑器检测）
- [ ] 实现文件复制逻辑（根据适配器类型）
- [ ] 实现 `.agentmem/` 初始化
- [ ] 添加进度输出（emoji + chalk）
- [ ] 处理 `--force` 覆盖逻辑
- [ ] 处理 `--global` 全局路径
- [ ] 处理 `--with-mcp` 参数

### 任务 3：实现 audit 命令
- [ ] 创建 `src/commands/audit.js`
- [ ] 创建 `src/utils/checks.js`
- [ ] 实现 10 个检查函数：
  - [ ] `debt` - 债务计数检查
  - [ ] `sync` - request 同步检查
  - [ ] `project` - project 更新检查
  - [ ] `size` - project 膨胀检查
  - [ ] `request-size` - request 膨胀检查
  - [ ] `todo` - todolist 状态检查
  - [ ] `active` - 活动任务检测
  - [ ] `confirmed` - request 确认状态
  - [ ] `archive` - 归档完整性检查
  - [ ] `structure` - 结构完整性检查
- [ ] 实现输出格式化（表格/emoji）
- [ ] 实现 `--json` 输出
- [ ] 实现单项检查 `audit <check>`

### 任务 4：更新 common-rules.md
- [ ] 备份当前 `adapters/common-rules.md`
- [ ] 删除冗余内容（约 55 行）：
  - [ ] 规则5 违规/正确流程示例
  - [ ] 文件详解表格（合并到核心文件）
  - [ ] AI 自检清单
  - [ ] 部分反模式对照
- [ ] 新增内容（约 30 行）：
  - [ ] 检查点协议章节
  - [ ] 审核工具章节
- [ ] 精简 7 条规则，删除详细示例
- [ ] 反模式对照保留 3-4 条
- [ ] 更新 `build-adapters.sh` 生成新版本

### 任务 5：更新 scripts 和 examples
- [ ] 废弃 `scripts/init-agentmem.sh`（功能迁移到 CLI）
- [ ] 检查并更新 `scripts/archive-task.sh`
- [ ] 检查并更新 `scripts/refresh-context.sh`
- [ ] 检查并更新 `scripts/setup.sh`
- [ ] 更新 `examples/01-new-feature/.agentmem/`
- [ ] 更新 `examples/02-refactor/.agentmem/`
- [ ] 更新 `examples/03-debug/.agentmem/`

### 任务 6：测试
- [ ] 测试 `npx flowmem init` 在空目录
- [ ] 测试 `npx flowmem init --adapter cursor`
- [ ] 测试 `npx flowmem init --force` 覆盖
- [ ] 测试 `npx flowmem audit` 完整检查
- [ ] 测试 `npx flowmem audit debt` 单项检查
- [ ] 测试所有 7 个适配器：
  - [ ] Cursor
  - [ ] Claude Code
  - [ ] Windsurf
  - [ ] Copilot
  - [ ] Cline
  - [ ] Trae
  - [ ] Gemini

### 任务 7：发布 v1.0.0
- [ ] 更新版本号 `npm version 1.0.0`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm test`
- [ ] 发布到 npm `npm publish --access public`
- [ ] 验证安装 `npx flowmem@latest init`

---

## v1.1.0：完善功能（1-2 天）

### 任务 8：实现 upgrade 命令
- [ ] 创建 `src/commands/upgrade.js`
- [ ] 实现版本检查逻辑（npm registry）
- [ ] 实现文件更新逻辑（保留 .agentmem）
- [ ] 实现回滚机制（备份旧版本）
- [ ] 测试升级流程

### 任务 9：实现 status 命令
- [ ] 创建 `src/commands/status.js`
- [ ] 实现版本读取
- [ ] 实现文件状态读取
- [ ] 实现格式化输出
- [ ] 测试 status 命令

### 任务 10：自定义配置
- [ ] 设计 `.agentmem/config.yaml` 格式
- [ ] 实现配置加载逻辑
- [ ] 更新 audit 命令使用配置
- [ ] 支持自定义阈值（debt_max、project_max_lines）
- [ ] 支持启用/禁用特定检查
- [ ] 测试配置功能

### 任务 11：发布 v1.1.0
- [ ] 更新版本号 `npm version 1.1.0`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm test`
- [ ] 发布到 npm `npm publish`
- [ ] 验证升级 `npx flowmem upgrade`

---

## v2.0.0：LLM 审核（2-3 天，可选）

### 任务 12：MCP Server 开发
- [ ] 创建独立 npm 包 `@flowmem/mcp-server`
- [ ] 设计 MCP Server 架构
- [ ] 实现 MCP Tools：
  - [ ] `audit_action` - 预审核
  - [ ] `validate_checkpoint` - 检查点验证
  - [ ] `get_violation_report` - 违规报告
- [ ] 实现 LLM 调用（多 provider 支持）：
  - [ ] OpenAI 兼容 API
  - [ ] Anthropic API
  - [ ] Ollama 本地模型
- [ ] 集成到主包（可选依赖）
- [ ] 测试 MCP Server
- [ ] 发布 `@flowmem/mcp-server`

### 任务 13：发布 v2.0.0
- [ ] 更新版本号 `npm version 2.0.0`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm test`
- [ ] 发布到 npm `npm publish`
- [ ] 测试 `npx flowmem init --with-mcp`

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
