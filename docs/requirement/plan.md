# FlowMem 改造计划（基于 docs/requirement/new.md）

## 目标
1. 保留现有流程（可优化不推翻）。
2. Claude Code 全量安装并使用其特性；其他 IDE 采用 v1 工作流最简接入。
3. Agent 之间实现上下文隔离（Claude Code 路径）。
4. 评估 ccq-engine 是否必要，支持内置检索工具替代。
5. Agent 支持单独 key；无 key 时走默认模型/默认工具。
6. 用户接入简单，同时支持复杂配置。

## 核心原则
- 以规则/模板驱动为主，减少对外部 LLM Key 的强依赖。
- 保留四阶段工作流主线，允许分支和可选路径。
- 复杂任务可插入实施细化层（implementation），提高确认信息量。
- 双轨接入：Claude Code 全功能 + 其他 IDE v1 最简流程。
- 上下文隔离用“Subagent + 文件化记忆”实现。
- ccq-engine 做可选依赖，默认优先使用开发工具自带检索。

## 方案概览

### 1) 流程保留与优化
- 继续使用“需求澄清 → 详细规划 → 执行与审核 → 交付”主线。
- 增加可选分支：简化流程（小任务）与完整流程（中大型任务）。
- 固化阶段产出：`.agentmem/request.md`、`.agentmem/todolist.md`、`.agentmem/review.md`、`.agentmem/delivery.md`。
- 可选实施细化层：`.agentmem/implementation/*`（plan/pseudocode/interfaces）。

### 2) Claude Code 全功能集成
- Claude Code **全量安装**（commands + agents + skills + MCP 可选）。
- 以 **Subagent** 为核心实现多 Agent 架构（上下文隔离）。
- Orchestrator 保持在主会话，负责阶段推进与文件产出校验。
- Subagent 负责具体任务执行，结果以摘要写回 `.agentmem/*`。
- 外部模型调用（如 Codex/Gemini）作为可选加速器，不作为必需路径。

### 3) 其他 IDE 最简接入（v1 工作流）
- Trae/Copilot 等仅配置 v1 工作流（见 `docs/optimize/old_workflow.md`）。
- 不使用多 Agent 结构，单会话执行。
- 优化点：明确触发条件、固定产出文件、动作输出规范，保证 AI 按流程运行。

### 4) Agent 上下文隔离方案（Claude Code 路径）
- **Claude Code Subagent 天然隔离上下文**：
  - 每个 Subagent 有独立上下文窗口与独立 loop。
  - 主会话只收到摘要结果，不继承子代理完整推理与日志。
- **通信只通过文件**：
  - 共享仅通过 `.agentmem/*` 交接。
  - 禁止跨 Agent 共享原始上下文，仅共享“摘要化产出”。
- **Skills 显式注入**：
  - Subagent 不继承主会话 skills，必须在 frontmatter 显式列出。
- **工具与权限隔离**：
  - Reviewer/Critic 只读（禁 Write/Edit）。
  - Coder 可写，Planner/Analyst 允许检索工具。
  - Background Subagent 不可用 MCP（官方限制），涉及 MCP 的任务需前台执行。
  
**其他 IDE 路径**:
- 单会话执行，不强制上下文隔离。
- 通过“文件化记忆 + 输出约束”降低上下文污染。

### 5) ccq-engine 评估与定位
- **现状能力基线（基于代码/设计）**：
  - AST 感知切分 + 线性切分兜底（Tree-sitter + LineChunker）。
  - 混合检索：BM25 + Vector + RRF 融合（支持符号名/路径加权）。
  - SQLite 持久化索引，可跨会话复用。
  - 输出 Context Packer，面向 LLM 的结构化拼接。
- **默认定位**：
  - 工具自带检索优先（Claude Code / Trae / Copilot）。
  - ccq-engine 作为“可选增强检索层”，用于大仓库或跨会话稳定检索。
- **何时保留 ccq-engine 有意义**：
  1) 仓库较大（多模块、多语言、长文件），内置检索命中不稳定。
  2) 需要可控的检索策略（BM25/Vector 权重、topK、索引持久化）。
  3) 需要跨会话可复用的检索结果（避免每次重新扫描）。
- **何时可降级不用**：
  1) 小型仓库、需求简单，内置检索已足够。
  2) 不愿承担索引构建与维护成本。
  3) 工具本身提供高质量检索且可满足可用性要求。
- **评估维度（必须量化）**：
  - 召回率（topK 覆盖关键文件/关键符号比例）。
  - 精准率（topK 中与需求相关的比例）。
  - 端到端耗时（首次检索延迟 + 增量索引成本）。
  - 维护成本（索引大小、更新频率、失败率）。
  - 兼容性（多语言覆盖与忽略规则准确性）。
- **验证方法（统一用例集）**：
  - 设定 20~30 个真实任务 query（覆盖前端/后端/配置/脚本）。
  - 每个 query 记录：命中关键文件数、topK 相关比例、检索耗时。
  - 对比三组：工具内置检索、ccq-engine、混合策略。
- **关于“弱一些但超长 token 模型做检索”的判断**：
  - 如果作为 **embedding 模型**：准确率主要取决于 embedding 质量，token 长度只对“可输入更长文本”有帮助，未必提升精准度；可被 BM25+RRF 部分弥补。
  - 如果作为 **query 扩展/摘要模型**（前置整理需求+关键词）：可提升召回率，尤其是长需求/复杂任务，但需评估是否引入噪声。
  - 结论：**效率可提升（本地索引 + 混合检索更快更稳），准确率提升与否依赖 embedding 质量**，需用用例集数据验证。
- **建议的保留策略**：
  - 默认走“工具内置检索”，ccq-engine 作为可选增强层（开关）。
  - 当内置检索 topK 命中不足或跨会话稳定性差时，启用 ccq-engine。
  - 如使用“弱模型做检索”，优先搭配 BM25+RRF，并在关键场景由更强模型做 re-rank 或最终确认。

### 5.1) Claude Code Subagent 配置建议（模板级）
- **Orchestrator（主会话）**：不做重计算，只做阶段推进与校验。
- **Analyst**：`tools: [Read, mcp__*, Search]`，`permissionMode: plan`，`model: sonnet|haiku`。
- **Solver**：只读 + 设计输出，`permissionMode: plan`。
- **Critic/Reviewer**：严格只读，`disallowedTools: [Write, Edit, Bash]`。
- **Planner**：只读 + 任务拆解，`permissionMode: plan`。
- **Coder**：可写，`permissionMode: acceptEdits`。
- **Context Curator（可选）**：长上下文模型专用，产出 `.agentmem/context.md`。

### 6) Key 管理策略
- 允许 per-agent key（如 Reviewer 用 Claude Code，Planner 用 GLM）。
- 无 key 时回退到工具默认模型（不阻塞流程）。
- 统一配置入口（简单模式/高级模式）。

### 7) 用户接入体验
- 简单模式：Claude Code 全量安装 or 其他 IDE v1 规则模板。
- 高级模式：多模型路由 + per-agent key + 检索与审计开关。

## 分阶段计划

### Phase 0 - 对齐与验收标准
- 输出：需求确认清单 + 验收标准（含上下文隔离与接入体验指标）。
- 评估 ccq-engine 现状与替代方案成本。

### Phase 1 - 设计与模板化
- 输出：Orchestrator 代理模板、6 个 Agent 模板、产出文件规范、implementation 细化模板。
- 定义 Claude Code 全功能模式流程与降级路径。

### Phase 2 - 工具适配策略
- Claude Code：全量安装 + Subagent 闭环。
- Trae/Copilot：v1 最简流程（单会话 + 文件化记忆）。
- 配置规范：简单模式 + 高级模式文档。

### Phase 3 - 运行与验证
- 测试重点：上下文隔离、阶段产出完整性、工具兼容性。
- 通过标准：无 key 也可完成流程；隔离有效；产出一致。

## 交付物清单
- 统一工作流规范文档（阶段定义 + 产出标准）。
- Claude Code 全量安装模板集（commands + agents + skills）。
- 其他 IDE v1 规则模板与产出规范。
- implementation 细化模板与示例（plan/pseudocode/interfaces）。
- ccq-engine 评估报告与启用建议。
- 配置指南（简单模式 / 高级模式）。

## 风险与应对
- 风险：Agent 隔离效果不足。
  - 应对：强制新会话执行 + 只通过文件化记忆交互。
- 风险：多工具适配成本过高。
  - 应对：先保证 Claude Code 完整功能，其他工具按“最小可用”策略推进。
- 风险：ccq-engine 使用门槛高。
  - 应对：默认不用，作为可选增强。

## 需要确认的问题
- 目标默认工具优先级排序（Claude Code > 其他工具？）。
- 多模型路由是否必须支持，还是可选增强。
- `.agentmem` 目录结构是否保持现状或可调整。
