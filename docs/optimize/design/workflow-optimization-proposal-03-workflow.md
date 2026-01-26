# FlowMem Workflow 优化方案 v2.8 - 四阶段工作流

## 三、四阶段工作流

### 3.1 流程总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        四阶段工作流                              │
│                                                                 │
│  🔵 = AI 自主执行    🟡 = 用户介入点                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: 需求澄清                    输出: request.md          │
│  ───────────────────                  ─────────────────         │
│  🔵 1.1 上下文检索 (工具内置优先 / ccq-engine 可选)             │
│  🔵 1.2 需求完整性评分 (flowmem-analyst)                        │
│     └─ 🟡 <7分则追问用户补充信息                                │
│  🔵 1.3 方案迭代 (flowmem-solver + flowmem-critic，最多 2 轮)   │
│  🟡 1.4 用户确认方案 → 生成 request.md                          │
│                                                                 │
│  Phase 2: 详细规划                    输出: todolist.md         │
│  ───────────────────                  ─────────────────         │
│  🔵 2.0 实施细化 (implementation 目录，可选)                    │
│  🔵 2.1 WBS 任务分解 (flowmem-planner)                           │
│  🔵 2.2 依赖识别 + 工作量估算 (任务点)                           │
│  🟡 2.3 用户确认 → 生成 todolist.md                             │
│                                                                 │
│  Phase 3: 执行与审核                  默认无需用户介入           │
│  ────────────────────                 ────────────────          │
│  🔵 3.1 单步执行 (flowmem-coder，每次1个Todo)                     │
│  🔵 3.2 自动审核 (flowmem-reviewer)                               │
│  🔵 3.3 审核不通过 → 自动重做                                   │
│  🔵 3.4 更新 todolist.md 状态 (使用 flowmem todo CLI)           │
│                                                                 │
│  Phase 4: 交付                        输出: 交付报告             │
│  ──────────                           ─────────────             │
│  🔵 4.1 最终审查 (对照验收标准)                                  │
│  🔵 4.2 运行测试 (按项目配置/兜底策略)                           │
│  🔵 4.3 生成交付报告                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**固定介入点**: 方案确认 + 规划确认（2 次）
**可变介入点**: 需求评分追问、实施细化确认（复杂任务/用户要求时）、中途需求变更、flowmem-reviewer 无法自动修复、高风险变更或测试不可跑时

> 💡 用户可随时介入调整需求或方向，系统不应限制介入次数。
> 上述流程是"最小介入路径"，不是"唯一路径"。

#### 阶段映射（ccg-workflow → 四阶段）

```
ccg-workflow 六阶段              FlowMem 四阶段
━━━━━━━━━━━━━━━━━━━━━            ━━━━━━━━━━━━━━━━━━━
Phase 0: Prompt增强     ┐
Phase 1: 研究与分析     ├──→    Phase 1: 需求澄清
Phase 2: 方案构思       ┘         输出: request.md

Phase 3: 详细规划       ───→    Phase 2: 详细规划
                                  输出: todolist.md

Phase 4: 执行           ┐
Phase 5: 优化           ├──→    Phase 3: 执行与审核
                        ┘

Phase 6: 评审           ───→    Phase 4: 交付
```

#### 简化路径（小任务）

满足以下条件可走简化路径：
- 影响 ≤2 文件，且不涉及核心模块/高风险路径
- 无需跨模块协作

简化路径仍需产出 `.agentmem/request.md` 与 `.agentmem/todolist.md`，但可跳过 Solver+Critic 迭代。

#### 极简路径（微任务）

满足以下**全部**条件可走极简路径：
- 影响 ≤1 文件
- 预估修改 ≤30 行代码
- 用户需求描述清晰（≥30 字且无歧义词如"优化"、"改进"）
- 非高风险路径（不在 `project.md` 的 `high_paths` 中）
- 非新功能（仅修复、调整、重命名等）

**极简路径流程**:

```
用户需求 → Orchestrator 快速评估 → 直接生成 request.md + todolist.md → flowmem-coder 执行 → flowmem-reviewer 审核 → 完成
```

**跳过的步骤**:
- ❌ flowmem-analyst 需求评分
- ❌ flowmem-solver + flowmem-critic 方案迭代
- ❌ 用户方案确认（仅在执行后确认结果）

**极简路径的 request.md 模板**:

```yaml
---
created_at: "2026-01-22T10:30:00Z"
status: auto_confirmed
path: minimal
completeness_score: auto
---

# 微任务: [简短描述]

## 变更内容
- 文件: [文件路径]
- 操作: [修改/修复/重命名]
- 描述: [用户原始需求]

## 验收标准
- [ ] 代码无语法错误
- [ ] 符合用户描述的预期
```

**安全兜底**:
- 极简路径的 flowmem-reviewer 审核**不可跳过**
- 若 flowmem-reviewer 发现问题复杂度超出预期，自动升级到简化路径或完整路径

---

### 3.2 Phase 1: 需求澄清

**目标**: 将模糊需求转化为清晰、可执行的 request.md

**输入**: 用户的原始需求描述  
**输出**: `.agentmem/request.md`

#### 步骤 1.1: 上下文检索（内置优先 + 可选增强）

**调用规则**: ccq-engine 由 Orchestrator 按规则/配置触发（例如仓库大、跨语言、内置检索命中不足、跨会话需求），不由主模型自由决定。

```typescript
// 优先使用工具内置检索；ccq-engine 作为可选增强
const context = await tool.search_context({ query: userRequest, topK: 15 });
// 可选：ccq-engine 用于大仓库或跨会话稳定检索
// const context = await ccqEngine.retrieve(userRequest, { topK: 15 });
// 检索结果提供给 Agent 系统（flowmem-analyst/flowmem-solver）分析
```

#### 步骤 1.1.1: Context Curator（可选）

当主会话 token 预算不足时，使用专用子代理进行上下文打包：

1. 读取候选文件（来自检索结果）
2. 输出 `.agentmem/context.md`（包含路径、行号、关键片段摘要）
3. 其他 Agent 仅读取该文件，避免上下文膨胀

#### 步骤 1.2: 需求完整性评分（flowmem-analyst）

> **设计原则（借鉴 Lyra 4-D 方法论）**: AI 应主动识别缺失信息并追问，而不是让用户猜测 AI 需要什么。

**flowmem-analyst 的 4-D 处理流程**:

```
1. DECONSTRUCT（解构）
   - 提取用户意图、关键实体、上下文
   - 识别输出要求和约束
   - 映射"已提供的信息" vs "缺失的信息"

2. DIAGNOSE（诊断）
   - 检查清晰度和歧义点
   - 评估完整性和具体性
   - 判断复杂度级别

3. DEVELOP（生成追问）
   - 针对缺失信息生成 2-3 个具体问题
   - 使用智能默认值减少不必要的追问
   - 问题应具体、可回答，而非泛泛而问

4. DELIVER（输出评分）
   - 输出完整性评分 + 问题清单
```

**评分维度**:

| 维度 | 分值 | 评估标准 | 典型追问示例 |
|------|------|----------|--------------|
| 目标明确性 | 0-3 | 是否清楚要实现什么功能？ | "你希望用户点击按钮后发生什么？" |
| 预期结果 | 0-3 | 是否明确成功的标准？ | "怎样算做完了？有没有验收标准？" |
| 边界范围 | 0-2 | 是否清楚包含/不包含什么？ | "这次只做 API 还是前端也要改？" |
| 约束条件 | 0-2 | 是否了解技术/业务限制？ | "有没有性能要求或兼容性限制？" |

#### 评分阈值自适应

根据复杂度动态调整阈值，避免小任务过度追问或大任务追问不足。

**复杂度估算**:
- 低: ≤2 文件、无跨模块
- 中: 3-5 文件或 1 个跨模块
- 高: >5 文件或含新 API/迁移/权限

**阈值**:
- 低复杂度: ≥6 通过
- 中复杂度: ≥7 通过
- 高复杂度: ≥8 通过

**止损机制**:
- 达到阈值: 继续进入方案设计
- 低于阈值: ⛔ 停止，向用户提出 2-3 个针对性问题

**追问策略**:

| 策略 | 说明 | 示例 |
|------|------|------|
| **针对性** | 问具体问题，不要泛泛而问 | ✅ "用户认证用 JWT 还是 Session？" ❌ "还有什么要补充的吗？" |
| **智能默认** | 有些信息可以推断，不必事事都问 | "如无特殊要求，我假设使用项目现有的 REST 风格" |
| **限制数量** | 最多 3 个问题，避免问卷式轰炸 | 优先问影响方案方向的关键问题 |
| **提供选项** | 给出选项比开放式问题更易回答 | "A. 纯后端 API，B. 含前端页面，C. 全栈" |

**flowmem-analyst 输出格式**:

```markdown
## 需求分析结果

**完整性评分**: 5/10

**已明确**:
- 目标: 实现用户登录功能
- 约束: 使用现有 PostgreSQL 数据库

**待澄清**:
1. 认证方式: JWT Token 还是 Session Cookie？
2. 范围: 只做后端 API，还是包含前端登录页面？
3. 安全要求: 是否需要双因素认证？

---
请回答以上问题，或直接告诉我"用默认方案"。
```

#### 步骤 1.3: 方案迭代（flowmem-solver + flowmem-critic）

> 详细机制见 [2.3 方案迭代机制](./workflow-optimization-proposal-02-architecture.md)

**简要流程**:
1. flowmem-solver 生成方案 V1
2. flowmem-critic 审核（检查方向正确性、技术可行性、完整性、风险点）
3. 未通过 → flowmem-solver 根据反馈修改 → flowmem-critic 再审（最多 2 轮）
4. 通过 → 用户确认

#### 步骤 1.4: 用户确认

**用户操作选项**:
| 操作 | 说明 |
|------|------|
| ✅ 确认 | 直接回复「确认」或「ok」，AI 继续生成 request.md |
| 🔄 调整 | 提出具体修改意见，AI 重新整合 |
| ❌ 否决 | 选择备选方案或要求重新分析 |

**默认行为**: 不允许静默确认。  
**例外**: 仅当用户显式 opt-in 且风险为 Low 时允许静默继续。

建议在 request.md 中加入:
```yaml
allow_silent_continue: false
```

#### 步骤 1.5: 生成 request.md（用户确认后）

```yaml
---
created_at: "2026-01-22T10:30:00Z"
status: confirmed
chosen_plan: "方案A"
completeness_score: 9
---

# 需求: [功能名称]

## 功能目标
[一句话描述]

## 范围定义
### 包含
- ...

### 不包含
- ...

## 技术方案
[选定的方案详情]

## 验收标准
- [ ] 标准1
- [ ] 标准2
```

---

### 3.3 Phase 2: 详细规划

**目标**: 将 request.md 转化为可执行的 todolist.md

**输入**: `.agentmem/request.md`（如启用实施细化，还包括 `.agentmem/implementation/*`）  
**输出**: `.agentmem/todolist.md`

#### 步骤 2.0: 实施细化（可选）

**目的**: 在复杂任务中提供最大信息量的确认材料，降低方向偏差。

**触发条件（满足其一即可）**:
- 修改 >5 文件或 >200 LOC
- 跨模块/跨语言
- 涉及迁移/权限/安全/核心流程
- 用户明确要求“详细设计/伪代码/接口说明”

**输出目录**: `.agentmem/implementation/`
- `plan.md`（层级结构、关键步骤、执行顺序）
- `pseudocode.md`（核心流程伪代码）
- `interfaces.md`（接口/数据结构/配置清单）

**用户确认**: 实施细化完成后由 Orchestrator 汇总要点并请求确认；拒绝则回退到方案修订。

#### 步骤 2.1: WBS 任务分解

如存在 implementation 目录，flowmem-planner 必须优先依据其内容拆解任务；若与 request.md 冲突，需提示用户确认。

```
Level 1: 功能
  └── Level 2: 模块（前端/后端/数据库）
        └── Level 3: 文件/任务
              └── TODO-XXX: 具体任务 + 验收条件
```

#### 步骤 2.2: 依赖识别 + 工作量估算

- 识别任务间依赖关系
- 识别可并行任务
- 使用"任务点"估算（1点 ≈ 1-2小时）

#### 步骤 2.3: 生成 todolist.md

```yaml
---
meta:
  request_ref: ".agentmem/request.md"
  total_points: 13
  progress: 0%
todos:
  - id: TODO-001
    content: "任务描述"
    status: pending
    priority: high
    points: 2
    depends_on: []
    acceptance:
      - "验收条件1"
      - "验收条件2"
---

# 任务清单: [功能名称]

## 执行顺序
1. TODO-XXX - 无依赖，优先
2. TODO-XXX ∥ TODO-XXX - 可并行
```

---

### 3.4 Phase 3: 执行与审核

**目标**: 按计划执行任务，每步自动审核

#### 执行循环

```
for each todo in todolist:
    │
    ├─ 1. 检索上下文 (工具内置优先 / ccq-engine 可选)
    │      context = search_context(todo.content)
    │
    ├─ 2. 执行任务 (flowmem-coder)
    │      changes = coderImplement(todo, context)
    │
    ├─ 3. 自动审核 (flowmem-reviewer)
    │      result = reviewerReview(changes, todo.acceptance)
    │
    ├─ 4. 结果处理
    │      if PASS: update_status(completed)
    │      else: retry_with_strategy()
    │
    └─ 5. 更新进度
```

#### 重试策略

当 flowmem-reviewer 审核不通过时，按以下策略重试：

```
retry_with_strategy():
    │
    ├─ 重试次数 < 2?
    │   │
    │   ├─ 第 1 次重试
    │   │   ├─ 将 flowmem-reviewer 反馈传递给 flowmem-coder
    │   │   ├─ flowmem-coder 根据反馈修改代码
    │   │   └─ 重新提交 flowmem-reviewer 审核
    │   │
    │   └─ 第 2 次重试
    │       ├─ 重新检索上下文（扩大范围 topK * 1.5）
    │       ├─ flowmem-coder 基于新上下文重新实现
    │       └─ 重新提交 flowmem-reviewer 审核
    │
    └─ 重试次数 >= 2?
        ├─ 标记 todo 状态为 blocked
        ├─ 生成失败报告（含历次尝试摘要）
        └─ 升级到用户，提供：
            - 失败原因分析
            - 历次尝试的差异
            - 建议的解决方向
```

**重试状态记录**:

每次重试在 `.agentmem/logs/retry-<todo-id>.md` 中记录：

```markdown
## TODO-001 重试记录

### 第 1 次尝试
- 时间: 2026-01-22T10:30:00Z
- flowmem-reviewer 反馈: 缺少错误处理
- 状态: 失败

### 第 2 次尝试（根据反馈修改）
- 时间: 2026-01-22T10:35:00Z
- 修改内容: 添加 try-catch 块
- flowmem-reviewer 反馈: 通过
- 状态: 成功
```

**重试限制的例外**:

以下情况可突破 2 次重试限制（需用户确认）：
- 用户明确要求继续尝试
- 每次重试都有实质性进展（flowmem-reviewer 反馈问题数减少）

#### flowmem-reviewer 审核清单

| 级别 | 检查项 | 必须通过 |
|------|--------|----------|
| **Critical** | 代码有实际逻辑（非 console.log/TODO） | ✅ |
| **Critical** | lsp_diagnostics 无错误 | ✅ |
| **Critical** | 满足 todo 的 acceptance 条件 | ✅ |
| Major | 代码符合项目规范 | 建议 |
| Major | 错误处理完整 | 建议 |
| Minor | 命名清晰、注释适当 | 可选 |

#### 高风险变更升级门槛

为避免自动执行带来不可逆风险，引入风险分级与升级动作。

**风险分级规则**:
- Low: 修改 ≤2 个文件、≤50 LOC、无权限/认证/迁移
- Medium: 3-5 文件或 50-200 LOC，或涉及核心模块
- High: 认证/权限/生产配置/数据迁移/删除/不可逆操作，或 >200 LOC、>8 文件

**升级动作**:
- Low: flowmem-reviewer 通过即可自动 apply
- Medium: flowmem-reviewer 通过 + 必跑测试；测试缺失需用户确认
- High: 必须用户确认后才 apply，且需二次审核或显式高风险批准

**默认高风险路径（可在 project.md 覆盖）**:
- auth/
- security/
- migrations/
- db/
- infra/
- config/
- .github/workflows/
- .env

---

### 3.5 Phase 4: 交付

**目标**: 最终审查并生成交付报告

#### 完成度检查

- 对照 request.md 的验收标准
- 检查所有 todo 状态

#### 测试与诊断策略（可配置 + 兜底）

- 优先读取 `.agentmem/project.md` 的测试策略。
- 无配置时按项目脚本执行，无法运行则标记原因。

---
#### 测试运行示例

```bash
lsp_diagnostics   # 类型检查
npm run test      # 单元测试
npm run build     # 构建检查
```

#### 交付报告模板

```markdown
## ✅ 功能开发完成

### 变更摘要
| 文件 | 操作 | 说明 |

### 审核结果
| 检查项 | 结果 |
| 任务完成 | ✅ X/X |
| 类型检查 | ✅ 无错误 |
| 单元测试 | ✅ X/X 通过 |

### 后续建议
1. [ ] ...
```

---

### 3.6 回滚机制

当执行过程中发现方案有问题或用户需要撤销变更时，提供回滚能力。

#### 回滚触发方式

| 触发方式 | 说明 |
|----------|------|
| 用户命令 | 输入 `/rollback` 或 "回滚" |
| flowmem-reviewer 连续失败 | 同一 todo 重试 2 次仍失败 |
| 用户中途否决 | 用户明确表示方案方向错误 |

#### 回滚粒度

```
回滚级别:
├─ todo 级回滚（默认）
│   └─ 撤销当前 todo 的所有变更，状态改为 pending
│
├─ phase 级回滚
│   └─ 回退到上一个用户确认点（Phase 1 或 Phase 2）
│
└─ 全量回滚
    └─ 撤销本次任务的所有变更，回到任务开始前状态
```

#### 回滚执行流程

```
/rollback [level]
    │
    ├─ 1. 确认回滚范围
    │      - 列出将被撤销的变更
    │      - 用户确认（高风险操作）
    │
    ├─ 2. 执行回滚
    │      - git stash 或 git checkout 恢复文件
    │      - 更新 todolist.md 状态
    │
    ├─ 3. 记录回滚日志
    │      - 生成 .agentmem/logs/rollback-<timestamp>.md
    │      - 记录回滚原因、范围、时间
    │
    └─ 4. 恢复执行点
           - todo 级：继续当前 todo
           - phase 级：回到对应 phase 的确认点
           - 全量：结束任务，等待新指令
```

#### 回滚日志模板

```markdown
## 回滚记录

**时间**: 2026-01-22T10:30:00Z
**级别**: todo / phase / full
**触发方式**: 用户命令 / flowmem-reviewer 失败 / 用户否决

### 回滚范围

| 文件 | 操作 | 原因 |
|------|------|------|
| src/auth/login.ts | 恢复 | 方案方向错误 |

### 状态变更

- TODO-003: completed → pending
- TODO-004: in_progress → pending

### 后续建议

[基于回滚原因的改进建议]
```

---

### 3.7 异常处理流程

#### 异常类型与处理策略

```
异常处理流程:
│
├─ Agent 超时（>60s 无响应）
│   ├─ 重试 1 次（延长超时到 120s）
│   ├─ 仍超时 → 降级到简化流程
│   └─ 记录超时日志，标记任务为 degraded
│
├─ Agent 报错（API 错误/解析失败）
│   ├─ 记录错误详情到 .agentmem/logs/error.jsonl
│   ├─ 通知用户错误类型
│   └─ 等待用户指令（重试/跳过/终止）
│
├─ 检索失败（无结果/服务不可用）
│   ├─ 回退到工具内置检索
│   ├─ 仍失败 → 提示用户手动提供上下文
│   └─ 记录检索失败原因
│
├─ 文件冲突（目标文件被外部修改）
│   ├─ 检测文件 hash 变化
│   ├─ 提示用户确认是否覆盖
│   └─ 用户选择：覆盖/合并/跳过
│
├─ 用户无响应（等待确认超时）
│   ├─ 30 分钟后自动暂停
│   ├─ 保存当前状态到 .agentmem/session.json
│   └─ 下次会话可恢复
│
└─ Token 超限
    ├─ 触发 Context Curator 压缩上下文
    ├─ 仍超限 → 拆分任务为子任务
    └─ 记录超限原因，优化后续检索策略
```

#### 异常日志格式

```json
{
  "timestamp": "2026-01-22T10:30:00Z",
  "type": "agent_timeout",
  "agent": "flowmem-coder",
  "todo_id": "TODO-003",
  "details": {
    "timeout_seconds": 60,
    "retry_count": 1
  },
  "resolution": "degraded_to_simple_path",
  "user_notified": true
}
```

#### 会话恢复

当用户无响应导致暂停后，下次会话可恢复：

```markdown
## 会话恢复提示

检测到未完成的任务：

**任务**: 实现用户登录功能
**暂停时间**: 2026-01-22T10:30:00Z
**当前进度**: Phase 3 - TODO-003 (3/10)

是否继续？
- [继续] 从 TODO-003 继续执行
- [回顾] 查看已完成的变更
- [重新开始] 放弃当前进度，重新规划
```
