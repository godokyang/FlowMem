# Workflow 模块审查报告（v2.7 实现）

## 发现问题（按严重程度排序）

### Critical
- AgentRegistry 没有注册内置 Agent；`workflow start` 创建的是空注册表，所有 `agentRegistry.call(...)` 会在 Phase 1 前直接抛错。Ref: `packages/ccq-workflow/src/agents/registry.ts:24-47`, `packages/ccq-workflow/src/cli/commands/workflow.ts:25-35`。
- Phase 1 的澄清流程有致命问题：score < 7 时不会触发用户追问；且 `clarifiedRequirements.push(...(analystResult.questions[i]))` 会对对象做展开导致运行时异常，也不会记录用户回答。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:145-159`, `packages/ccq-workflow/src/orchestrator/user-interaction.ts:100-107`。
- Phase 3 转换需要 `todoItem`，但代码传的是 `todoId`，触发 `requiresData` 校验失败，流程中断。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:239`, `packages/ccq-workflow/src/orchestrator/transitions.ts:145-149`。
- Phase 3 传给 Coder 的 `context` 实际是检索器结果对象；Coder 期望 `CodeChunk[]` 并直接 `.map`，会崩溃。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:237-245`, `packages/ccq-workflow/src/agents/coder.ts:22-28`。
- todo 完成状态没有更新到 `todolist` 本体，`getNextPendingTodo` 仍会选到同一个 todo，存在死循环风险。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:225-276`, `packages/ccq-workflow/src/memory/manager.ts:88-96`。

### High
- 上下文检索总是选择 `CCQEngineRetriever`（基类 `isAvailable()` 恒为 true），但 `ccqEngineAvailable` 从未设置，导致始终返回空上下文，Agent 实际无代码信息。Ref: `packages/ccq-workflow/src/context/retriever.ts:30-31`, `packages/ccq-workflow/src/context/factory.ts:22-31`, `packages/ccq-workflow/src/context/ccq-engine-retriever.ts:12-23`。
- Solver + Critic 的迭代机制缺失：Critic 反馈没有回传给 Solver；并且流程继续前进但 `chosenPlan` 为空，没有形成可确认方案。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:169-197`, `packages/ccq-workflow/src/orchestrator/orchestrator.ts:73-76`。
- Reviewer 未通过的路径不完整：没有重试循环、没有把 Reviewer 反馈回传给 Coder、也没有 apply-changes 与 interceptor/audit 的结合，导致“Coder -> Reviewer -> 修复”闭环失效。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:241-274`, `packages/ccq-workflow/src/interceptor/file-interceptor.ts:1-63`。
- Memory 持久化几乎未实现：`saveCoreMemory` 不写文件，trace/decision log 仅 console.log，没有产出 `.agentmem/request.md` 和 `.agentmem/todolist.md`。Ref: `packages/ccq-workflow/src/memory/manager.ts:39-85`。
- Phase 4（最终审查、测试、交付报告）没有实现，流程在 Phase 3 结束。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:78-84`, `packages/ccq-workflow/src/orchestrator/orchestrator.ts:279`。
- CLI 使用 `new LLMClient({})` 未配置 apiKey/provider，实际运行会鉴权失败。Ref: `packages/ccq-workflow/src/cli/commands/workflow.ts:25-35`, `packages/ccq-workflow/src/llm/client.ts:256-268`。

### Medium
- Workflow phase 类型在多个模块不一致：`memory` 用 `phase1/phase2`，orchestrator 用 `phase1.start` 等；transitions 也包含未被实现的状态，影响日志、状态恢复与测试一致性。Ref: `packages/ccq-workflow/src/memory/types.ts:46`, `packages/ccq-workflow/src/orchestrator/types.ts:10-38`, `packages/ccq-workflow/src/orchestrator/transitions.ts:111-161`。
- Phase 1 检索 query 仅使用 `fileFilters.join(' ')`；为空时会对全仓库进行粗搜索，相关性低且性能不稳定。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:285-294`, `packages/ccq-workflow/src/context/simple-retriever.ts:16-58`。
- `contextRetrieverFactory` 已注入配置但完全未使用，Orchestrator 直接调用静态 `RetrieverFactory.create`，导致依赖注入和测试不可控。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:54-55`, `packages/ccq-workflow/src/orchestrator/orchestrator.ts:285-287`。
- CLI 命令多为占位，与设计文档不一致（todo/audit/hook 与 workflow status/abort 未实现）。Ref: `packages/ccq-workflow/src/cli/commands/todo.ts:10-20`, `packages/ccq-workflow/src/cli/commands/audit.ts:10-14`, `packages/ccq-workflow/src/cli/commands/hook.ts:10-13`。
- Pre-commit 审计忽略 `requiresConfirmation`，高风险文件仍会被当作允许修改，未落地高风险阻断策略。Ref: `packages/ccq-workflow/src/interceptor/pre-commit-audit.ts:27-39`。

### Low
- resume 流程对 `stateMetadata.data!` 没有保护，若保存的状态缺 `data` 则可能抛异常。Ref: `packages/ccq-workflow/src/orchestrator/orchestrator.ts:109-111`, `packages/ccq-workflow/src/orchestrator/orchestrator.ts:376-379`。
- `MemoryManager.saveCoreMemory` 只创建路径变量但不写入文件，且 `llmClient` 未被使用，属于死代码/未完成实现。Ref: `packages/ccq-workflow/src/memory/manager.ts:16-46`。

## 单元测试缺口
- 无 Solver/Critic/Planner/Coder/Reviewer 的 parse/容错测试。
- 无 Phase 1 追问分支（score < 阈值）、Solver+Critic 迭代、Reviewer 失败重试的测试。
- 无 transition 必要数据校验、todo 状态推进、resume 流程的测试。
- 无 `@ccq/engine` 缺失时的检索降级测试。
- 无 `.agentmem` 持久化与审计日志输出的测试。

## 实际测试准备
- 配置 LLM API key 与 provider/model（CLI 当前不加载 env/config）。
- 如使用 `@ccq/engine`，需安装并在项目内执行 `npx @ccq/engine index`。
- 确保项目根目录可写入 `.agentmem/`。
- 需要在 git 仓库内且有 staged 变更，才能验证 pre-commit/audit。
- 端到端测试要考虑交互输入（TTY 或 mock `UserInteractionHandler`）。

## 开放问题 / 假设
- 目前存在两套 CLI（TS `src/cli` 与旧 JS `src/commands`），实际入口以哪套为准？
- Phase 3 变更是由 workflow 直接落盘，还是由外部运行时负责写入并配合拦截器/审计？
