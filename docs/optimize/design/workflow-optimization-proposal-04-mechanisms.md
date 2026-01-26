# FlowMem Workflow 优化方案 v2.8 - 支撑机制

## 4.1 Subagent 权限隔离（Claude Code）

通过 Subagent 配置实现强约束：
- flowmem-reviewer/flowmem-critic 只读（禁 Write/Edit/Bash）。
- flowmem-planner/flowmem-analyst 允许检索工具。
- flowmem-coder 允许写入（acceptEdits）。
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

### 文件交接规范

#### 文件格式统一

所有 Subagent 交接文件必须遵循以下格式：

```yaml
---
# YAML frontmatter（必须）
created_at: "2026-01-22T10:30:00Z"
created_by: "Solver"  # Agent 名称
version: 1
type: "plan" | "review" | "context" | "report"
---

# Markdown body（必须）
[具体内容]
```

#### 文件大小限制

| 文件类型 | 最大行数 | 超限处理 |
|----------|----------|----------|
| request.md | 300 行 | 拆分为 request.md + request-details.md |
| todolist.md | 500 行 | 按模块拆分为 todolist-<module>.md |
| context.md | 500 行 | 压缩摘要或拆分为多个 context-<topic>.md |
| 审核报告 | 200 行 | 仅保留关键结论，详情存入 logs/ |

#### 并发写入控制

为避免多个 Subagent 同时写入同一文件导致冲突：

```bash
# 写入前获取锁
acquire_lock() {
  LOCK_FILE=".agentmem/.lock"
  while ! mkdir "$LOCK_FILE" 2>/dev/null; do
    sleep 0.1
  done
}

# 写入后释放锁
release_lock() {
  rmdir ".agentmem/.lock" 2>/dev/null
}
```

**锁超时机制**:
- 锁持有超过 30 秒自动释放
- 锁文件包含持有者信息：`.agentmem/.lock/holder`

#### Subagent 输出约定

| Agent | 输出文件 | 格式要求 |
|-------|----------|----------|
| flowmem-analyst | `.agentmem/analysis.md` | 评分 + 问题清单 |
| flowmem-solver | `.agentmem/plan.md` | 方案描述 + 技术选型 |
| flowmem-critic | `.agentmem/review.md` | 通过/拒绝 + 问题清单 |
| flowmem-planner | `.agentmem/todolist.md` | YAML frontmatter + 任务列表 |
| Orchestrator | 直接修改代码文件 | 遵循项目规范 |
| flowmem-reviewer | `.agentmem/logs/review-<todo-id>.md` | 审核结论 + 详细反馈 |

---

## 4.3 审计留痕与可追溯性

`.agentmem/` 允许存敏感信息，因此保留最小可回放证据链：
- 用户确认后的需求版本（含时间戳）。
- 关键检索片段的引用或摘要（含路径）。
- flowmem-solver/flowmem-critic/flowmem-reviewer 结论摘要（含拒绝原因）。
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

## 4.5 写入拦截与 Hooks（可选）

### 4.5.1 写入拦截（保护文件）

**保护清单**:
- `.agentmem/request.md`
- `.agentmem/todolist.md`
- `.agentmem/project.md`

**策略**:
- 默认禁止直接写入，由 Orchestrator 统一更新。
- 需要修改时，必须先在 todolist 标注理由并走 flowmem-reviewer 复核。

### 4.5.2 Git Pre-commit Hook

```bash
#!/bin/bash
flowmem audit pre-commit || exit 1
```

### 4.5.3 Claude Code Hooks（AI 行为约束）

**目标**: 利用 Claude Code 的 Hook 能力，在关键节点对 AI 行为做强约束，避免偷懒与规则遗漏。

**Hook 设计原则**:
- 快速、可重复、无网络依赖，失败时给出明确拒绝理由。
- 高风险操作默认拦截（fail-closed），低风险仅提示（warn）。
- 规则来源统一于 `.agentmem/project.md` 与 common-rules。

**建议 Hook 点（示意，具体事件名以 Claude Code hooks guide 为准）**:

| Hook 点 | 触发时机 | 目的 | 典型动作 |
|---------|----------|------|----------|
| **Pre-Session/Pre-Message** | 开始处理请求前 | 强制加载规则与上下文 | 检查 `.agentmem/request.md`/`todolist.md` 是否存在；缺失则要求补全 |
| **Pre-Tool (Write/Edit)** | 写入或编辑前 | 阻止越权修改 | 拦截保护文件与高风险路径；校验当前 todo 是否匹配 |
| **Post-Tool (Write/Edit)** | 写入或编辑后 | 留痕与同步 | 追加 `.agentmem/logs/trace.jsonl`；更新 todo 状态或变更摘要 |
| **Pre-Response** | 回复用户前 | 质量门禁 | 如触及高风险路径，要求 flowmem-reviewer 通过或提示必须跑测试 |

**Hook 输出约定**:
- 阻断时必须返回可执行提示（例如"先补 request.md"、"需要 flowmem-reviewer 复核"）。
- 通过时可补充简短提醒（例如"已记录变更摘要"）。

**规则矩阵（示例）**:

| 规则 | 触发条件 | 动作 |
|------|----------|------|
| **核心记忆缺失** | `.agentmem/request.md` 或 `.agentmem/todolist.md` 缺失 | block |
| **保护文件写入** | 写入/编辑保护清单文件 | block |
| **高风险路径** | 命中高风险路径且未 flowmem-reviewer 通过 | block |
| **Todo 未对齐** | 当前变更不匹配进行中的 todo | warn |
| **测试未记录** | 高风险变更且未记录测试计划 | warn |

**最小落地顺序**:
1. Pre-Tool 写入拦截（保护文件/高风险路径）。
2. Pre-Response 质量门禁（flowmem-reviewer 结论/测试要求）。
3. Post-Tool 留痕（trace.jsonl + 变更摘要）。
4. Pre-Session 规则加载校验（核心记忆文件存在性）。

**实际配置（Claude Code hooks 格式）**:

Claude Code hooks 基于 shell 命令执行，需配套实现 `flowmem guard` CLI 工具。

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "flowmem guard check-protected \"$CLAUDE_FILE_PATH\""
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "flowmem guard check-risk \"$CLAUDE_FILE_PATH\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "flowmem guard log-change \"$CLAUDE_FILE_PATH\" \"$CLAUDE_TOOL_NAME\""
          }
        ]
      }
    ]
  }
}
```

**flowmem guard CLI 命令说明**:

| 命令 | 功能 | 退出码 |
|------|------|--------|
| `flowmem guard check-protected <path>` | 检查是否为保护文件 | 0=允许, 1=拦截 |
| `flowmem guard check-risk <path>` | 检查高风险路径 | 0=允许, 1=拦截(需确认), 2=警告 |
| `flowmem guard log-change <path> <tool>` | 记录变更到 trace.jsonl | 始终 0 |
| `flowmem guard check-core-mem` | 检查核心记忆文件是否存在 | 0=存在, 1=缺失 |

**check-protected 实现逻辑**:

```bash
#!/bin/bash
# flowmem guard check-protected
PROTECTED_FILES=(
  ".agentmem/request.md"
  ".agentmem/todolist.md"
  ".agentmem/project.md"
)

for protected in "${PROTECTED_FILES[@]}"; do
  if [[ "$1" == *"$protected"* ]]; then
    echo "BLOCKED: 保护文件 $protected 禁止直接修改，请通过 Orchestrator 更新"
    exit 1
  fi
done
exit 0
```

**check-risk 实现逻辑**:

```bash
#!/bin/bash
# flowmem guard check-risk
# 从 .agentmem/project.md 读取高风险路径，或使用默认值
HIGH_RISK_PATHS=(
  "auth/" "security/" "migrations/" "db/"
  "infra/" ".github/workflows/" ".env"
)

for risk_path in "${HIGH_RISK_PATHS[@]}"; do
  if [[ "$1" == *"$risk_path"* ]]; then
    # 检查是否有 flowmem-reviewer 通过标记
    if [[ ! -f ".agentmem/.reviewer_approved" ]]; then
      echo "BLOCKED: 高风险路径 $risk_path 需要 flowmem-reviewer 审核通过"
      exit 1
    fi
  fi
done
exit 0
```

**log-change 实现逻辑**:

```bash
#!/bin/bash
# flowmem guard log-change
mkdir -p .agentmem/logs
echo "{\"timestamp\":\"$(date -Iseconds)\",\"tool\":\"$2\",\"path\":\"$1\"}" >> .agentmem/logs/trace.jsonl
exit 0
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
