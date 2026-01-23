# FlowMem Workflow 优化方案 v2.8 - 支撑机制

## 4.1 Subagent 权限隔离（Claude Code）

通过 Subagent 配置实现强约束：
- Reviewer/Critic 只读（禁 Write/Edit/Bash）。
- Planner/Analyst 允许检索工具。
- Coder 允许写入（acceptEdits）。
- Subagent 不继承主会话 skills，需显式注入。

**注意**: Background Subagent 不可用 MCP 工具；涉及检索的任务需前台执行。

---

## 4.2 记忆分层与文件化交接

**设计目标**: 只共享必要信息，避免上下文膨胀。

| 记忆类型 | 生命周期 | 处理方式 | 典型载体 |
|----------|----------|----------|----------|
| **核心记忆** | 全任务周期 | 必须持久化 | `.agentmem/request.md` / `.agentmem/todolist.md` / `.agentmem/project.md` |
| **阶段记忆** | 单阶段 | 阶段结束后归纳 | `request.md` 方案摘要、`todolist.md` 任务结构 |
| **临时记忆** | 单次调用 | 不保存 | 检索原文、推理过程 |

**核心记忆最小集合**:
- 用户确认后的需求与验收标准（request.md）。
- 任务清单与状态（todolist.md）。
- 项目级默认策略（project.md）。

**可选细化层**:
- 复杂任务可增加 `.agentmem/implementation/`，作为详细实施方案与伪代码的载体。

---

## 4.3 审计留痕与可追溯性

`.agentmem/` 允许存敏感信息，因此保留最小可回放证据链：
- 用户确认后的需求版本（含时间戳）。
- 关键检索片段的引用或摘要（含路径）。
- Solver/Critic/Reviewer 结论摘要（含拒绝原因）。
- 变更摘要与测试结果。

**推荐格式**:
- `.agentmem/logs/trace.jsonl` 按步骤追加。
- `.agentmem/logs/decision-<id>.md` 记录关键决策。

---

## 4.4 借鉴 OMC：skills 与 agent 模板增强

**目标**: 保持 FlowMem 独立，但吸收 OMC 成熟的组织方式。

**技能分层（Skill Layers）**:
- **执行层**: 对应主流程阶段（需求澄清/规划/执行/交付）。
- **增强层**: 性能/安全/前端/测试/数据库等可组合能力。
- **保证层**: 质量门禁与确认点，默认开启。

**模板继承与分级**:
- 统一基础模板（职责、输入/输出、工具边界）。
- 低/中/高复杂度变体（简洁 → 深度）。
- 明确升级信号（跨模块/多次失败/高风险）。

**升级输出格式**:
```
ESCALATION RECOMMENDED: [原因] -> [建议提升到的 Agent/模型]
```

**Notepad/Wisdom 机制（可选）**:
- `.agentmem/notepad/<plan-id>/` 下分层记录：
  - `learnings.md`（经验）
  - `decisions.md`（关键决策）
  - `issues.md`（阻塞与问题）
  - `problems.md`（技术债与遗留）
- 记录格式: `[YYYY-MM-DD HH:MM] <内容>`。
- 触发条件: 新决策、重复问题、跨模块依赖或风险升级。

---

## 4.5 写入拦截与 Hook（可选）

**写入拦截（保护文件）**:
- `.agentmem/request.md`
- `.agentmem/todolist.md`
- `.agentmem/project.md`

**Git Pre-commit Hook**:

```bash
#!/bin/bash
flowmem audit pre-commit || exit 1
```

---

## 4.6 项目级策略配置（可选）

在 `.agentmem/project.md` 中集中配置风险与测试策略。

```yaml
workflow:
  risk:
    high_paths:
      - "auth/"
      - "security/"
      - "migrations/"
      - "db/"
      - "infra/"
      - ".github/workflows/"
      - ".env"
  tests:
    primary:
      - "lsp_diagnostics"
      - "npm test"
      - "npm run build"
    fallback:
      - "pytest"
      - "go test ./..."
```
