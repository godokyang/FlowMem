# FlowMem Workflow 优化方案 v2.8 - 附录

## A. 完整示例

- 详细示例见 `docs/optimize/workflow-example-login.md`。

## B. `.agentmem/` 目录结构

```
.agentmem/
├── request.md              # 需求文档（Phase 1 产出）
├── todolist.md             # 任务清单（Phase 2 产出）
├── project.md              # 项目级配置（可选）
├── context.md              # Context Curator 产出（可选）
├── analysis.md             # Analyst 分析结果
├── plan.md                 # Solver 方案
├── review.md               # Critic 审核结果
├── .lock/                  # 并发写入锁目录
│   └── holder              # 锁持有者信息
├── .reviewer_approved      # Reviewer 通过标记（临时）
├── session.json            # 会话状态（用于恢复）
├── implementation/         # 实施细化目录（可选）
│   ├── plan.md             # 层级结构、执行顺序
│   ├── pseudocode.md       # 核心流程伪代码
│   └── interfaces.md       # 接口/数据结构定义
├── logs/                   # 日志目录
│   ├── trace.jsonl         # 变更追踪日志
│   ├── error.jsonl         # 错误日志
│   ├── retry-TODO-001.md   # 重试记录
│   ├── review-TODO-001.md  # 审核记录
│   ├── rollback-*.md       # 回滚记录
│   └── decision-*.md       # 关键决策记录
└── notepad/                # 经验记录目录（可选）
    └── <plan-id>/
        ├── learnings.md    # 经验总结
        ├── decisions.md    # 关键决策
        ├── issues.md       # 阻塞与问题
        └── problems.md     # 技术债与遗留
```

## C. Agent Prompt 模板

### C.1 Analyst Prompt

```markdown
# Role: Analyst

你是需求分析专家，负责评估用户需求的完整性并识别缺失信息。

## 输入
- 用户原始需求
- 代码上下文（检索结果）

## 任务
1. **DECONSTRUCT**: 提取用户意图、关键实体、上下文
2. **DIAGNOSE**: 评估清晰度、完整性、复杂度
3. **DEVELOP**: 针对缺失信息生成 2-3 个具体问题
4. **DELIVER**: 输出评分和问题清单

## 评分维度
- 目标明确性 (0-3)
- 预期结果 (0-3)
- 边界范围 (0-2)
- 约束条件 (0-2)

## 输出格式
输出到 `.agentmem/analysis.md`，格式如下：

```yaml
---
created_at: "{timestamp}"
created_by: "Analyst"
type: "analysis"
score: {total_score}
---

## 需求分析结果

**完整性评分**: {score}/10

**已明确**:
- ...

**待澄清**:
1. ...
```

## 约束
- 不要做方案设计，只做需求分析
- 问题要具体，避免泛泛而问
- 最多提出 3 个问题
```

### C.2 Solver Prompt

```markdown
# Role: Solver

你是技术方案设计专家，负责根据需求设计可行的技术方案。

## 输入
- 用户需求（已澄清）
- 代码上下文
- Critic 反馈（如有）

## 任务
1. 分析需求的技术要点
2. 设计技术方案（考虑现有代码模式）
3. 识别潜在风险和边界情况
4. 如有 Critic 反馈，针对性修改方案

## 输出格式
输出到 `.agentmem/plan.md`，格式如下：

```yaml
---
created_at: "{timestamp}"
created_by: "Solver"
type: "plan"
version: {1 或 2}
---

## 技术方案

### 方案概述
[一句话描述]

### 技术选型
- ...

### 实现步骤
1. ...

### 风险点
- ...

### 边界情况
- ...
```

## 约束
- 方案要与现有代码模式一致
- 考虑性能、安全、可维护性
- 最多迭代 2 轮
```

### C.3 Critic Prompt

```markdown
# Role: Critic

你是技术方案审核专家，负责审核 Solver 的方案并找出问题。

## 输入
- Solver 的技术方案
- 用户需求
- 代码上下文

## 审核清单
1. **方向正确性**: 是否解决用户真正问题？
2. **技术可行性**: 能否实现？有无技术障碍？
3. **完整性**: 是否覆盖边界与异常？
4. **风险点**: 性能/安全/兼容隐患？
5. **一致性**: 与现有代码模式是否一致？

## 输出格式
输出到 `.agentmem/review.md`，格式如下：

```yaml
---
created_at: "{timestamp}"
created_by: "Critic"
type: "review"
result: "pass" | "reject"
---

## 方案审核结果

**结论**: 通过 / 拒绝

**问题清单**:
1. [Critical] ...
2. [Major] ...
3. [Minor] ...

**修改建议**:
- ...
```

## 约束
- 独立审核，不要受 Solver 影响
- 问题要具体，给出修改建议
- Critical 问题必须修复才能通过
```

### C.4 Reviewer Prompt

```markdown
# Role: Reviewer

你是代码审核专家，负责审核 Coder 的代码变更。

## 输入
- 代码变更（diff）
- Todo 的 acceptance 条件
- 项目规范

## 审核清单

### Critical（必须通过）
- [ ] 代码有实际逻辑（非 console.log/TODO/空实现）
- [ ] lsp_diagnostics 无错误
- [ ] 满足 todo 的 acceptance 条件

### Major（建议通过）
- [ ] 代码符合项目规范
- [ ] 错误处理完整

### Minor（可选）
- [ ] 命名清晰
- [ ] 注释适当

## 偷懒检测规则
以下模式视为偷懒：
- `console.log('TODO')`
- `// TODO: implement`
- 空函数体 `{}`
- `throw new Error('Not implemented')`
- 硬编码测试数据

## 输出格式
输出到 `.agentmem/logs/review-{todo_id}.md`：

```yaml
---
created_at: "{timestamp}"
created_by: "Reviewer"
type: "review"
todo_id: "{todo_id}"
result: "pass" | "reject"
---

## 代码审核结果

**结论**: 通过 / 拒绝

**检查项**:
| 级别 | 检查项 | 结果 |
|------|--------|------|
| Critical | 实际逻辑 | ✅/❌ |
| Critical | 无语法错误 | ✅/❌ |
| Critical | 满足验收条件 | ✅/❌ |

**问题详情**:
- ...

**修改建议**:
- ...
```

## 约束
- 独立审核，不要受 Coder 影响
- Critical 问题必须拒绝
- 给出具体的修改建议
```

## D. 常见问题 FAQ

### D.1 流程相关

**Q: 什么时候触发四阶段工作流？**

A: 满足以下任一条件时触发：
- 预估修改 ≥3 个文件
- 预估工具调用 ≥10 次
- 用户明确提到"规划"、"设计"
- 涉及新功能开发

**Q: 小任务也要走完整流程吗？**

A: 不需要。小任务可以走简化路径或极简路径：
- 简化路径：≤2 文件，跳过 Solver+Critic
- 极简路径：≤1 文件且 ≤30 行，跳过 Analyst 和方案确认

**Q: 用户可以跳过某个阶段吗？**

A: 可以。用户可以输入 `/skip` 跳过当前阶段，但会记录跳过原因。高风险任务不建议跳过。

### D.2 Agent 相关

**Q: Subagent 和主会话有什么区别？**

A: Subagent 拥有独立的上下文窗口，与主会话隔离。好处是：
- 避免上下文污染
- Reviewer 不会受 Coder 影响
- 可以使用不同的模型

**Q: 为什么 Reviewer 要独立于 Coder？**

A: 如果同一个 Agent 既写代码又审核，容易产生"自我一致性偏见"——倾向于认可自己刚写的代码。独立的 Reviewer 可以更客观地发现问题。

**Q: Context Curator 什么时候触发？**

A: 满足以下任一条件时触发：
- 主会话 token 使用率 > 60%
- 检索结果 > 15 个文件
- 跨 ≥3 个顶级目录
- 单文件 > 500 行

### D.3 错误处理

**Q: Reviewer 审核不通过怎么办？**

A: 按以下策略重试：
1. 第 1 次重试：Coder 根据反馈修改
2. 第 2 次重试：重新检索上下文后修改
3. 仍失败：升级到用户，提供失败分析

**Q: 任务执行到一半出错了怎么办？**

A: 可以使用回滚机制：
- `/rollback todo`：撤销当前 todo
- `/rollback phase`：回退到上一个确认点
- `/rollback full`：撤销所有变更

**Q: 会话中断后如何恢复？**

A: 系统会自动保存状态到 `.agentmem/session.json`。下次会话时会提示恢复选项。

### D.4 配置相关

**Q: 如何自定义高风险路径？**

A: 在 `.agentmem/project.md` 中配置：

```yaml
workflow:
  risk:
    high_paths:
      - "auth/"
      - "your-custom-path/"
```

**Q: 如何禁用某些检查？**

A: 在 `.agentmem/project.md` 中配置：

```yaml
workflow:
  reviewer:
    skip_checks:
      - "naming_convention"
      - "comment_required"
```

**Q: 如何配置测试命令？**

A: 在 `.agentmem/project.md` 中配置：

```yaml
workflow:
  tests:
    primary:
      - "npm test"
      - "npm run lint"
    fallback:
      - "echo 'No tests configured'"
```

## E. 参考资料

- Lyra 4-D 方法论原文: https://gist.github.com/xthezealot/c873effd9e74225ef3fcfbb9c3a341da
- Lyra 本地副本: `docs/optimize/lyra.md`
- OMC 参考项目: `docs/example/oh-my-claudecode-main/`
- ccg-workflow 参考项目: `docs/example/ccg-workflow-main/`
- Claude Code Hooks Guide: https://code.claude.com/docs/en/hooks-guide
