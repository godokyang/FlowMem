# FlowMem Workflow 优化方案 - 执行 Prompt

**用途**: 用于指导 AI 根据设计文档和 TodoList 执行实现任务

---

## 使用说明

将以下 Prompt 复制到新的 AI 对话中，AI 将根据文档自动执行任务。

---

## Prompt 模板

### 完整实现 Prompt

```markdown
# 任务: 实现 FlowMem Workflow 优化方案

## 项目信息
- **项目路径**: /Users/yangke/Personal/own/FlowMem
- **包路径**: packages/ccq-workflow/src/
- **语言**: TypeScript
- **包管理**: npm + Lerna Monorepo

## 你需要阅读的文档

**必读** - 按顺序阅读:
1. `docs/optimize/todolist.md` - 完整任务清单（41 点）
2. `docs/optimize/implementation/workflow-optimization-implementation.md` - 实施总览

**按需查阅**:
- `docs/optimize/implementation/01-orchestrator.md` - Orchestrator 状态机规范
- `docs/optimize/implementation/02-agents.md` - 6 个 Agent 的 Prompt 和解析逻辑
- `docs/optimize/implementation/03-memory.md` - Memory 三层架构
- `docs/optimize/implementation/04-interceptor.md` - 写入拦截器和审计日志
- `docs/optimize/implementation/05-cli.md` - CLI 命令组规范
- `docs/optimize/implementation/06-adapters.md` - 适配器构建
- `docs/optimize/implementation/07-context-retriever.md` - 代码检索抽象层

**设计参考**:
- `docs/optimize/design/workflow-optimization-proposal.md` - 设计文档索引

## 执行要求

### 1. 按 TodoList 顺序执行
- 先完成 MVP 1，再完成 MVP 2，最后完成 GA
- 每个任务完成后进行 TypeScript 类型检查
- 遵循实施文档中的代码规范和验收标准

### 2. 代码规范
- 所有代码注释使用中文
- 遵循现有代码风格（查看 packages/ccq-workflow/src/ 下的现有 JS 文件）
- 不使用 `as any` 或 `@ts-ignore`
- 必须处理错误情况

### 3. 类型定义
- 从 `agents/types.ts` 导出所有 Agent 相关类型
- 从 `orchestrator/types.ts` 导出状态机类型
- 避免重复定义相同类型

### 4. 验收标准
每个模块完成后需验证:
- TypeScript 类型检查通过: `npx tsc --noEmit -p packages/ccq-workflow`
- 模块可正确导入导出

## 开始执行

1. 先阅读 `docs/optimize/todolist.md` 了解任务结构
2. 从 MVP1-01 开始执行
3. 每完成一个任务，标记进度并继续下一个
4. 遇到问题时参考对应的实施文档

现在开始执行任务。
```

---

### MVP 1 专项 Prompt

```markdown
# 任务: 实现 FlowMem Workflow MVP 1

## 目标
完成 MVP 1 的 17 个任务点，解决"偷懒与绕过"问题。

## 必读文档
1. `docs/optimize/todolist.md` - 查看 MVP 1 任务清单
2. `docs/optimize/implementation/02-agents.md` - Analyst 和 Reviewer Agent 规范
3. `docs/optimize/implementation/04-interceptor.md` - 写入拦截器规范

## 核心任务
1. **LLM 模块** (MVP1-01~03): 实现 LLM 客户端
2. **Agent 基础** (MVP1-04~06): 实现基类、类型、注册表
3. **核心 Agent** (MVP1-07~08): Analyst（需求评分）、Reviewer（偷懒检测）
4. **拦截器** (MVP1-09~13): 写入拦截、文件管理、审计日志
5. **Memory 骨架** (MVP1-14~16): 类型定义、管理器骨架

## 验收标准
- TypeScript 类型检查通过
- Analyst 能对需求评分并生成追问
- Reviewer 能检测偷懒代码模式
- 写入拦截器能阻止直接修改受保护文件

## 执行
从 MVP1-01 开始，按顺序执行到 MVP1-17。
```

---

### MVP 2 专项 Prompt

```markdown
# 任务: 实现 FlowMem Workflow MVP 2

## 前置条件
MVP 1 已完成

## 目标
完成 MVP 2 的 20 个任务点，打通完整流程。

## 必读文档
1. `docs/optimize/todolist.md` - 查看 MVP 2 任务清单
2. `docs/optimize/implementation/01-orchestrator.md` - 状态机规范
3. `docs/optimize/implementation/02-agents.md` - 剩余 4 个 Agent 规范
4. `docs/optimize/implementation/07-context-retriever.md` - 代码检索规范

## 核心任务
1. **剩余 Agent** (MVP2-01~06): Solver、Critic、Planner、Coder
2. **Orchestrator** (MVP2-07~11): 状态机、用户交互、状态转换
3. **Memory 完善** (MVP2-12~13): TodoList 管理、归纳器
4. **Context** (MVP2-14~19): 检索器接口、SimpleRetriever、CCQEngine 集成

## 验收标准
- 端到端流程可跑通
- Solver+Critic 迭代循环正常
- Coder+Reviewer 审核循环正常
- 高风险变更触发用户确认

## 执行
从 MVP2-01 开始，按顺序执行到 MVP2-20。
```

---

### GA 专项 Prompt

```markdown
# 任务: 完成 FlowMem Workflow GA 发布

## 前置条件
MVP 1 + MVP 2 已完成

## 目标
完成 GA 的 18 个任务点，稳定发布。

## 必读文档
1. `docs/optimize/todolist.md` - 查看 GA 任务清单
2. `docs/optimize/implementation/05-cli.md` - CLI 命令规范
3. `docs/optimize/implementation/06-adapters.md` - 适配器构建规范

## 核心任务
1. **CLI 命令** (GA-01~05): workflow、todo、audit、hook 命令组
2. **Git Hook** (GA-06~07): Hook 管理、pre-commit 审计
3. **适配器** (GA-08~12): 构建器、7 个编辑器适配器
4. **测试** (GA-13~16): 单元测试、集成测试
5. **文档** (GA-17~18): README、CHANGELOG

## 验收标准
- 所有测试通过
- CLI 命令帮助完整
- 7 个适配器成功生成
- 文档与示例完备

## 执行
从 GA-01 开始，按顺序执行到 GA-18。
```

---

### 修复类型错误 Prompt

```markdown
# 任务: 修复 FlowMem Workflow 类型错误

## 问题描述
`packages/ccq-workflow/src/orchestrator/orchestrator.ts` 存在类型冲突：
- `CriticIssue` 在 `orchestrator/types.ts` 和 `agents/types.ts` 中定义不一致
- `ReviewerIssue` 同样存在类型冲突
- `Solution` 缺少 `components` 属性

## 解决方案
1. 删除 `orchestrator/types.ts` 中的重复类型定义
2. 从 `agents/types.ts` 统一导入类型
3. 确保类型一致性

## 需要修改的文件
- `packages/ccq-workflow/src/orchestrator/types.ts`
- `packages/ccq-workflow/src/orchestrator/orchestrator.ts`

## 验收标准
- `npx tsc --noEmit -p packages/ccq-workflow` 无错误
```

---

## 执行检查清单

在执行任务前，确认以下条件:

- [ ] 项目目录存在: `/Users/yangke/Personal/own/FlowMem`
- [ ] 已安装依赖: `npm install`
- [ ] TypeScript 配置正确: `packages/ccq-workflow/tsconfig.json`
- [ ] 了解现有代码结构: `packages/ccq-workflow/src/`

## 常用命令

```bash
# 类型检查
npx tsc --noEmit -p packages/ccq-workflow

# 运行测试
npm test --workspace=packages/ccq-workflow

# 构建
npm run build --workspace=packages/ccq-workflow

# 构建适配器
npm run build:adapters --workspace=packages/ccq-workflow
```

---

## 注意事项

1. **类型一致性**: 避免在多个文件中定义相同类型，统一从一个位置导出
2. **中文注释**: 所有代码注释使用中文
3. **增量实现**: 每完成一个任务就进行类型检查，避免错误累积
4. **参考文档**: 实施文档中包含完整的代码示例，可直接参考使用
5. **验收标准**: 每个模块都有明确的验收标准，完成后需逐项检查
