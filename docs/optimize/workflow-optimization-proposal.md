# FlowMem Workflow 优化方案 v2.7

**调研日期**: 2026-01-22  
**参考项目**: ccg-workflow, Lyra 4-D Methodology  
**目标**: 解决 AI 偷懒、约束遗漏、缺乏审核机制等问题  
**版本**: 2.7 - 多 Agent 架构（最终版）

---

## 一、问题分析

### 1.1 当前痛点

| 问题 | 表现 | 根本原因 |
|------|------|----------|
| **AI 遗漏约束** | 忽略 common-rules.md、不用 CLI 直接 Edit | 规则过长(278行)、无强制机制 |
| **缺乏审核** | 事后检查、AI 自我审核不可靠 | 工作流无内置审核节点 |
| **AI 偷懒** | `console.log('TODO')` 就标完成 | 无质量关卡、无交叉验证 |
| **需求澄清不足** | request.md 过于简单、缺少方案对比 | 流程设计不完善 |
| **透明度不足** | 不知道 AI 在哪个阶段、进度不直观 | 无状态反馈机制 |

---

## 二、核心设计决策

### 2.1 ccq-engine 只做检索，主模型做分析

**问题**: ccg-workflow 的 Prompt 增强依赖 MCP 调用外部模型，但：
- 大多数用户只有一个 API key
- 本地模型效果不如云端主模型
- 增加复杂度和成本

**决策**: 职责分离

| ccq-engine 职责 | 主模型职责 |
|-----------------|-----------|
| ✅ 上下文检索 | ✅ 需求分析与增强 |
| ✅ 代码索引 | ✅ 方案设计与对比 |
| ✅ 语义搜索 | ✅ 任务分解与规划 |
| ❌ 不做分析 | ✅ 代码实现与审核 |
| ❌ 不做推理 | ✅ 综合判断与决策 |

**好处**: 不需额外 API key，利用主模型完整上下文和强推理能力。

---

### 2.2 方案迭代：Solver + Critic 循环审核

**问题**: 如何确保方案质量，而不只是产出多个相似选项？

**策略对比**:

| 策略 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| 双方案对比 | 两次独立调用产出 A/B | 提供选择 | ❌ 同模型思维相似，方案可能雷同 |
| 单方案迭代 | 生成 → 审核 → 修改 | ✅ 打磨质量 | 方向错误时需回退 |

**决策**: 采用 **单方案迭代（Solver + Critic 循环）**

**实现流程**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1.3: 方案迭代（最多 2 轮）                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────┐         ┌────────┐         ┌────────┐             │
│   │ Solver │    →    │ Critic │    →    │ Solver │             │
│   │ 方案V1 │         │ 审核   │         │ 方案V2 │             │
│   └────────┘         └────┬───┘         └────────┘             │
│                           │                                     │
│                     ┌─────┴─────┐                               │
│                     │           │                               │
│                  通过 ✅      不通过 ❌                          │
│                     │           │                               │
│                     ↓           ↓                               │
│               用户确认      Solver 修改                         │
│                                 │                               │
│                                 ↓                               │
│                           Critic 再审                           │
│                                 │                               │
│                           ┌─────┴─────┐                         │
│                        通过 ✅      仍不通过                     │
│                           │           │                         │
│                           ↓           ↓                         │
│                     用户确认    用户介入决策                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**理由**: 
- 迭代打磨比产出选项更有价值
- Critic 指出具体问题，修改有针对性
- 用户不需要做选择题，只需确认打磨后的方案

---

### 2.3 需求澄清：借鉴 Lyra 4-D 方法论

> **参考**: 
> - 原文: [Lyra Prompt (GitHub Gist)](https://gist.github.com/xthezealot/c873effd9e74225ef3fcfbb9c3a341da)
> - 本地副本: [docs/optimize/lyra.md](./lyra.md)

**核心理念**: 与其让用户写完美的需求描述，不如让 AI 主动识别缺失信息并追问。

**Lyra 4-D 方法论**:

| 阶段 | 含义 | 在 FlowMem 中的应用 |
|------|------|---------------------|
| **DECONSTRUCT** | 解构：提取意图、识别缺失 | Analyst 分析用户需求，映射已知 vs 未知 |
| **DIAGNOSE** | 诊断：检查清晰度、完整性 | 评分维度（目标/结果/边界/约束） |
| **DEVELOP** | 开发：生成针对性问题 | 生成 2-3 个具体追问，而非泛泛而问 |
| **DELIVER** | 交付：输出优化结果 | 生成 request.md |

**关键实践**:

1. **主动追问** - AI 不应等待用户补充，应主动识别缺失信息
2. **针对性问题** - 问 2-3 个具体问题，避免问卷式轰炸
3. **智能默认值** - 有些信息可以推断，不必事事都问
4. **提供选项** - 给出选项比开放式问题更易回答

**对比**:

| 传统方式 | FlowMem 方式（借鉴 Lyra） |
|----------|--------------------------|
| 用户: "帮我做登录功能" | 用户: "帮我做登录功能" |
| AI: 直接开始实现（猜测需求） | Analyst: "认证方式用 JWT 还是 Session？范围包含前端吗？" |
| 结果: 可能不符合预期 | 用户回答后 → 结果: 精准符合需求 |

---

### 2.4 流程整合：六阶段 → 四阶段

**问题**: ccg-workflow 的六阶段与原有 request.md/todolist.md 流程重合

**整合映射**:

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

**好处**: 与原有流程一致，每阶段有明确输出物，用户更容易理解。

---

### 2.5 用户介入策略：最小化原则

**问题**: 频繁的用户介入会降低工作效率，但完全不介入又可能偏离用户意图。

**设计原则**:

| 原则 | 说明 |
|------|------|
| **AI 先做，用户后审** | AI 完成分析/整合后，只需用户确认结果 |
| **介入点明确** | 只在关键决策点要求用户介入 |
| **快速确认** | 用户只需「确认/调整/否决」，不需要指导 AI 如何做 |
| **默认继续** | 简单场景下可提示「将按推荐方案继续」 |

**用户介入点清单**:

| 阶段 | 介入点 | 触发条件 | 用户操作 |
|------|--------|----------|----------|
| Phase 1 | 需求追问 | 评分 <7 分 | 回答补充问题 |
| Phase 1 | 方案确认 | **必须** | 确认/调整/否决 |
| Phase 2 | 规划确认 | **必须** | 确认/调整 |
| Phase 3 | 无（默认） | - | AI 全自动执行 |
| Phase 4 | 无 | - | 只接收交付报告 |
| **任意阶段** | 中途变更 | 用户主动介入 | 调整需求/方向 |

**中途变更处理**:

当用户在执行过程中提出新需求或调整方向时：

```
用户中途介入
     ↓
┌─ 变更影响评估 ────────────────────────────────┐
│  小变更（不影响已完成任务）→ 追加 todo，继续执行  │
│  中变更（需调整部分任务）→ 更新 todolist.md     │
│  大变更（需求本质变化）→ 回退到 Phase 1 重新澄清 │
└───────────────────────────────────────────────┘
```

> 💡 系统不限制用户介入次数。上述流程是"最小介入路径"，用户可随时介入。

**对比**:

| 场景 | 旧设计（v2.1） | 新设计（v2.2） |
|------|----------------|----------------|
| 多视角分析后 | 用户指导如何整合 | AI 自动整合，用户只看结果 |
| 方案对比 | 用户参与对比过程 | AI 给出推荐 + 理由，用户确认 |
| 执行过程 | 可能需要用户确认 | 全自动，Reviewer 负责质量 |

---

### 2.6 Agent 架构：多 Agent + 同模型

**决策**: 采用多 Agent 系统，使用同一模型（如 Claude），但每个 Agent 独立调用、独立上下文。

**为什么不用单模型多角色？**

| 问题 | 单模型多角色 | 多 Agent |
|------|-------------|----------|
| 自我一致性偏见 | ❌ Reviewer 倾向认可自己刚写的代码 | ✅ Reviewer 只看代码，不知道 Coder "想"什么 |
| 方案质量 | ❌ 一次生成，无审核 | ✅ Solver + Critic 迭代打磨 |
| 上下文污染 | ❌ 所有角色共享上下文 | ✅ 每个 Agent 独立上下文 |

---

#### Agent 清单（7 个）

| Agent | 职责 | 调用时机 | 输入 | 输出 |
|-------|------|----------|------|------|
| **Orchestrator** | 流程控制、状态管理、用户交互 | 全程 | 用户请求 | 协调指令、最终输出 |
| **Analyst** | 需求分析、完整性评分、追问 | Phase 1.2 | 用户需求 + 代码上下文 | 评分 + 追问问题 |
| **Solver** | 方案设计 | Phase 1.3 | 需求 + 上下文 + Critic 反馈 | 技术方案 |
| **Critic** | 方案审核、找问题 | Phase 1.3 | 方案 + 需求 + 约束 | 通过/问题清单 |
| **Planner** | 任务分解、WBS、依赖分析 | Phase 2 | request.md | todolist.md |
| **Coder** | 代码实现 | Phase 3 | 单个 todo + 上下文 | 代码变更 |
| **Reviewer** | 代码审核、质量把关 | Phase 3 | 代码变更 + 验收条件 | 通过/拒绝 + 理由 |

**共 7 个 Agent**:
- **Orchestrator**: 协调者（可代码实现）
- **Analyst, Solver, Critic, Planner**: Phase 1-2 方案阶段
- **Coder, Reviewer**: Phase 3 执行阶段

---

#### 方案迭代机制（Solver + Critic）

```
Phase 1.3: 方案迭代（最多 2 轮）

┌─────────────────────────────────────────────────────────────────┐
│  第一轮                                                         │
│  ┌────────────────────┐       ┌────────────────────┐            │
│  │     Solver         │       │      Critic        │            │
│  │  ─────────────     │       │  ─────────────     │            │
│  │  输入:             │       │  输入:             │            │
│  │   - 需求           │       │   - 方案 V1        │            │
│  │   - 代码上下文     │  →    │   - 需求           │            │
│  │   - 项目约束       │       │   - 约束           │            │
│  │  输出: 方案 V1     │       │  输出: 审核结果    │            │
│  └────────────────────┘       └─────────┬──────────┘            │
│                                         │                       │
│                                   ┌─────┴─────┐                 │
│                                   │           │                 │
│                                通过 ✅     不通过 ❌             │
│                                   │           │                 │
│                                   ↓           ↓                 │
│                             用户确认     第二轮修改              │
│                                                                 │
│  第二轮（如需要）                                                │
│  ┌────────────────────┐       ┌────────────────────┐            │
│  │     Solver         │       │      Critic        │            │
│  │  ─────────────     │       │  ─────────────     │            │
│  │  输入:             │       │  输入:             │            │
│  │   - 方案 V1        │       │   - 方案 V2        │            │
│  │   - Critic 反馈    │  →    │   - 需求           │            │
│  │  输出: 方案 V2     │       │  输出: 审核结果    │            │
│  └────────────────────┘       └─────────┬──────────┘            │
│                                         │                       │
│                                   ┌─────┴─────┐                 │
│                                   │           │                 │
│                                通过 ✅     仍不通过              │
│                                   │           │                 │
│                                   ↓           ↓                 │
│                             用户确认    用户介入决策             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Critic Agent 审核清单

| 类别 | 检查项 | 说明 |
|------|--------|------|
| **方向正确性** | 是否解决了用户的真正问题？ | 方向错误比细节问题更严重 |
| **技术可行性** | 能否实现？有无技术障碍？ | 考虑现有代码库约束 |
| **完整性** | 是否覆盖边界情况和异常处理？ | 检查遗漏场景 |
| **风险点** | 有无性能/安全/兼容性隐患？ | 识别潜在问题 |
| **与现有代码兼容** | 是否与项目现有模式一致？ | 参考 ccq-engine 检索结果 |

**Critic 输出格式**:

```markdown
## 方案审核结果

**结论**: ✅ 通过 / ❌ 需修改

### 问题清单（如有）
1. [问题类型] 问题描述
   - 影响: [说明]
   - 建议: [修改方向]

2. [问题类型] 问题描述
   ...
```

---

#### Solver vs Critic vs Reviewer 的区别

| Agent | 审核对象 | 审核时机 | 关注点 |
|-------|----------|----------|--------|
| **Critic** | 技术方案 | Phase 1（方案设计阶段） | 方向、可行性、完整性 |
| **Reviewer** | 代码变更 | Phase 3（代码实现阶段） | 代码质量、验收条件、偷懒检测 |

**类比**:
- Critic ≈ 架构评审（设计阶段）
- Reviewer ≈ Code Review（实现阶段）

---

#### Agent 通信机制

```
┌─────────────────────────────────────────────────────────────────┐
│                        Orchestrator                              │
│                      （流程控制中心）                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Phase 1                                                       │
│   ┌─────────┐                                                   │
│   │ Analyst │ → 需求评分 (≥7 继续, <7 追问)                      │
│   └────┬────┘                                                   │
│        ↓                                                        │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Solver ←→ Critic 迭代（最多 2 轮）              │           │
│   │  ┌────────┐      ┌────────┐                     │           │
│   │  │ Solver │  →   │ Critic │                     │           │
│   │  │ 方案V1 │      │ 审核   │                     │           │
│   │  └────────┘      └───┬────┘                     │           │
│   │                      │                          │           │
│   │               通过 ✅ │ 不通过 ❌                 │           │
│   │                 ↓     ↓                         │           │
│   │            用户确认   Solver 修改 → Critic 再审  │           │
│   └─────────────────────────────────────────────────┘           │
│        ↓                                                        │
│   用户确认 → request.md                                         │
│                                                                 │
│   Phase 2                                                       │
│   ┌─────────┐                                                   │
│   │ Planner │ → todolist.md → 用户确认                          │
│   └────┬────┘                                                   │
│        ↓                                                        │
│   Phase 3 (循环，每个 todo)                                      │
│   ┌──────────────────────────┐                                  │
│   │  ┌──────┐    ┌────────┐  │                                  │
│   │  │Coder │ →  │Reviewer│  │ ← 独立上下文，真正交叉审核        │
│   │  └──────┘    └────────┘  │                                  │
│   │       ↑          │       │                                  │
│   │       └─ 拒绝 ───┘       │                                  │
│   └──────────────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 关键隔离点

| 隔离点 | Agent A | Agent B | 隔离内容 |
|--------|---------|---------|----------|
| **方案审核** | Solver | Critic | Critic 独立审核方案，不知道 Solver 的思考过程 |
| **代码审核** | Coder | Reviewer | Reviewer 不知道 Coder 的推理过程 |

这两个隔离点是系统可靠性的关键。

---

#### 成本预估

| 阶段 | Agent 调用次数 | 说明 |
|------|---------------|------|
| Phase 1 | 2-4 次 | Analyst(1) + Solver(1) + Critic(1) + [Solver修改(1)] |
| Phase 2 | 1 次 | Planner |
| Phase 3 | 2N 次 | N 个 todo × (Coder + Reviewer) |
| Phase 4 | 0 次 | Orchestrator 整合，无需额外调用 |

**示例**: 10 个 todo 的任务
- 最佳情况（一次通过）: 1 + 1 + 1 + 1 + 20 = **24 次 API 调用**
- 典型情况（需一轮修改）: 1 + 1 + 1 + 1 + 1 + 1 + 20 = **26 次 API 调用**

---

#### Memory 管理策略

> **设计原则**: 记住该记的，忘掉该忘的。避免上下文膨胀，同时确保关键信息可追溯。

**Memory 分类**:

| 类型 | 生命周期 | 处理方式 | 示例 |
|------|----------|----------|------|
| **核心记忆** | 整个任务周期 | ✅ 持久化到文件，每次传入 Agent | 用户需求摘要、验收标准、项目约束 |
| **阶段记忆** | 单阶段内 | 📦 阶段结束后归纳精华，丢弃细节 | Solver 方案、Critic 反馈、Planner 任务列表 |
| **临时记忆** | 单次调用 | ❌ 不保存，用完即弃 | Agent 推理过程、中间计算、代码检索原文 |

---

**核心记忆（必须持久化）**:

| 信息 | 存储位置 | 说明 |
|------|----------|------|
| 用户原始需求 | `.agentmem/request.md` | 用户确认后的需求描述 |
| 验收标准 | `.agentmem/request.md` | 每个 todo 的验收条件 |
| 选定方案摘要 | `.agentmem/request.md` | Solver 最终方案的精简版 |
| 项目约束 | `.agentmem/project.md` 或检索缓存 | 从代码库提取的关键约束 |
| 任务状态 | `.agentmem/todolist.md` | 每个 todo 的当前状态 |

**核心记忆传递规则**:

```typescript
// 每个 Agent 调用都传入核心记忆
interface CoreMemory {
  requirement: string;       // 用户需求摘要（≤500字）
  acceptanceCriteria: string[]; // 验收标准列表
  constraints: string[];     // 项目约束（从代码检索归纳）
  chosenPlan: string;        // 选定方案摘要（≤300字）
  currentTodo?: TodoItem;    // 当前执行的 todo（Phase 3）
}
```

---

**阶段记忆（阶段内保留，结束后归纳）**:

| 阶段 | 阶段记忆内容 | 归纳后保留 | 丢弃 |
|------|-------------|-----------|------|
| Phase 1 | Solver 完整方案、Critic 问题清单 | 方案摘要（≤300字） | 推理过程、被否决的方案 |
| Phase 2 | Planner 完整任务分解 | todolist.md（结构化） | 分解过程、备选分解方案 |
| Phase 3 | Coder 代码变更、Reviewer 审核意见 | 变更摘要、审核结论 | 完整 diff、推理过程 |

**归纳规则**:

```typescript
// 阶段结束时，归纳精华
function summarizePhaseMemory(phaseOutput: any): string {
  // Phase 1: 方案 → 300字摘要
  // Phase 2: 任务列表 → 结构化 todolist
  // Phase 3: 代码变更 → "修改了 X 文件，实现了 Y 功能"
}
```

---

**临时记忆（不保存）**:

| 信息 | 为什么不保存 |
|------|-------------|
| Agent 推理过程 | 只关心结果，不关心"怎么想的" |
| 代码检索原文 | Token 太长，只保留归纳后的约束 |
| 被拒绝的方案细节 | 只保留"被拒原因"，不保留完整方案 |
| Critic/Reviewer 的完整分析 | 只保留"结论 + 问题清单" |
| 用户中间对话 | 只保留最终确认的需求 |

---

**Memory 传递示例**:

```
用户: "帮我实现用户登录功能"
          ↓
┌─ Analyst ────────────────────────────────────────────────┐
│ 输入:                                                    │
│   - 用户需求: "帮我实现用户登录功能"                       │
│   - 代码上下文: [ccq-engine 检索结果，~5000 tokens]        │
│                                                          │
│ 输出:                                                    │
│   - 评分: 6/10                                           │
│   - 追问: ["JWT 还是 Session?", "需要前端页面吗?"]        │
│                                                          │
│ 保存到核心记忆: ❌（需求未确认）                           │
└──────────────────────────────────────────────────────────┘
          ↓
用户回答: "用 JWT，只要后端 API"
          ↓
┌─ Analyst（再次）────────────────────────────────────────┐
│ 输入:                                                    │
│   - 用户需求 + 补充: "JWT 登录，后端 API"                  │
│   - 代码上下文: [ccq-engine 检索结果]                     │
│                                                          │
│ 输出:                                                    │
│   - 评分: 8/10 ✅                                        │
│                                                          │
│ 归纳到核心记忆:                                          │
│   - requirement: "实现 JWT 用户登录 API"                  │
│   - constraints: ["使用现有 PostgreSQL", "遵循 REST 风格"]│
└──────────────────────────────────────────────────────────┘
          ↓
┌─ Solver ─────────────────────────────────────────────────┐
│ 输入（核心记忆）:                                         │
│   - requirement: "实现 JWT 用户登录 API"                  │
│   - constraints: ["PostgreSQL", "REST"]                  │
│                                                          │
│ 输入（阶段记忆）: 无                                      │
│                                                          │
│ 输出: 完整方案（~2000 tokens）                            │
│                                                          │
│ 保存:                                                    │
│   - 阶段记忆: 完整方案（供 Critic 审核）                  │
│   - 核心记忆: ❌（等 Critic 通过后再归纳）                 │
└──────────────────────────────────────────────────────────┘
          ↓
┌─ Critic ─────────────────────────────────────────────────┐
│ 输入（核心记忆）:                                         │
│   - requirement + constraints                            │
│                                                          │
│ 输入（阶段记忆）:                                         │
│   - Solver 的完整方案                                    │
│                                                          │
│ 输出: 通过 ✅                                            │
│                                                          │
│ 归纳到核心记忆:                                          │
│   - chosenPlan: "使用 bcrypt + JWT，/auth/login 端点..." │
│                 （300字摘要）                             │
│                                                          │
│ 丢弃:                                                    │
│   - Solver 完整方案原文（已归纳）                         │
│   - Critic 推理过程                                      │
└──────────────────────────────────────────────────────────┘
```

---

**代码检索结果的处理**:

```typescript
// ❌ 错误: 传入完整检索结果（Token 爆炸）
const context = await ccqEngine.retrieve(query); // ~10000 tokens
agent.call({ context: context }); 

// ✅ 正确: 归纳后传入
const context = await ccqEngine.retrieve(query); 
const constraints = summarizeConstraints(context); // ~500 tokens
agent.call({ constraints: constraints });

// 归纳逻辑示例
function summarizeConstraints(codeContext: CodeChunk[]): string[] {
  // 提取: 使用的框架、数据库、命名规范、现有模式
  return [
    "框架: Express.js + TypeScript",
    "数据库: PostgreSQL + Prisma ORM", 
    "认证: 已有 JWT 工具函数在 src/utils/auth.ts",
    "命名: 使用 camelCase，文件用 kebab-case"
  ];
}
```

---

#### Orchestrator 实现：状态机 + LLM

**决策**: Orchestrator 采用 **代码状态机 + LLM 辅助** 方式实现。

- 流程控制用代码（确定性、可调试）
- 需要"理解"时才调用 LLM（归纳、整合、生成用户消息）

---

**为什么不用纯 LLM Agent？**

| 维度 | 纯 LLM Agent | 状态机 + LLM |
|------|-------------|--------------|
| **确定性** | ❌ LLM 可能"忘记"流程步骤 | ✅ 代码流程 100% 确定 |
| **可调试** | ❌ "为什么跳过了 Critic？" | ✅ 代码逻辑清晰可追踪 |
| **成本** | ❌ 每次决策都要调 LLM | ✅ 只在必要时调 LLM |
| **速度** | ❌ 多一次 LLM 往返 | ✅ 代码判断毫秒级 |
| **可靠性** | ❌ LLM 可能产生幻觉 | ✅ 代码不会"犯错" |

**纯 LLM 的风险示例**:

```
Orchestrator (LLM): "我现在要决定下一步..."
                     ↓
                  可能的输出：
                  - ✅ "调用 Critic 审核方案"（正确）
                  - ❌ "方案看起来不错，直接进入 Phase 2"（跳过审核！）
                  - ❌ "让我再想想..."（卡住）
```

LLM 有自由意志，可能"自作主张"跳过关键步骤。

---

**状态机的确定性**:

```typescript
class Orchestrator {
  async runPhase1() {
    // 1.1 - 代码控制，100% 执行
    const context = await this.ccqEngine.retrieve(request);
    
    // 1.2 - 必须调用 Analyst，不可能被跳过
    const analysis = await this.callAgent("analyst", { request, context });
    
    if (analysis.score < 7) {
      return this.askUser(analysis.questions); // 代码控制
    }
    
    // 1.3 - 必须调用 Solver，不可能被跳过
    const solution = await this.callAgent("solver", { request, context });
    
    // 1.4 - 必须调用 Critic，不可能被跳过
    const review = await this.callAgent("critic", { solution });
    
    if (!review.passed) {
      // 代码控制：失败就重做，没有"算了跳过"的可能
      return this.retrySolver(review.feedback);
    }
    
    // ✅ 只在需要"理解"时才用 LLM：整合方案给用户看
    const summary = await this.llmSummarize(solution);
    return this.askUserConfirm(summary);
  }
}
```

**关键**：代码保证 Critic 一定会被调用，LLM 没有机会"偷懒跳过"。

---

**什么时候用代码，什么时候用 LLM？**

| 场景 | 用代码 | 用 LLM |
|------|--------|--------|
| 决定调用哪个 Agent | ✅ | - |
| 检查评分 >= 7 | ✅ | - |
| 循环执行每个 todo | ✅ | - |
| 判断 Critic 是否通过 | ✅ | - |
| **归纳方案摘要** | - | ✅ |
| **整合 Critic 反馈给 Solver** | - | ✅ |
| **生成用户友好的确认消息** | - | ✅ |
| **归纳代码检索结果为约束** | - | ✅ |

**原则**：代码能做的不用 LLM，需要"理解"的才用 LLM。

---

**类比**:

| 类比 | 纯 LLM | 状态机 + LLM |
|------|--------|--------------|
| **公司** | CEO 决定每个细节 | 流程制度 + CEO 只做关键决策 |
| **代码** | 所有逻辑写在一个大 Prompt 里 | 代码控制流程，LLM 只处理子任务 |
| **自动驾驶** | 全靠 AI 判断 | 规则控制 + AI 处理复杂场景 |

---

**完整 Orchestrator 伪代码**:

```typescript
class Orchestrator {
  private ccqEngine: CCQEngine;
  private memory: CoreMemory;

  async run(userRequest: string) {
    // ========== Phase 1: 需求澄清 ==========
    
    // 1.1 上下文检索（代码控制）
    const codeContext = await this.ccqEngine.retrieve(userRequest);
    const constraints = await this.llmSummarize(codeContext); // LLM 归纳
    
    // 1.2 需求评分（必须调用 Analyst）
    const analysis = await this.callAgent("analyst", { 
      request: userRequest, 
      constraints 
    });
    
    if (analysis.score < 7) {
      // 代码控制：评分不够就追问，没有跳过的可能
      return this.askUser(analysis.questions);
    }
    
    // 保存到核心记忆
    this.memory.requirement = analysis.summarizedRequirement;
    this.memory.constraints = constraints;
    
    // 1.3 方案迭代（Solver + Critic，最多 2 轮）
    let solution = await this.callAgent("solver", { 
      requirement: this.memory.requirement,
      constraints: this.memory.constraints 
    });
    
    for (let round = 0; round < 2; round++) {
      // 必须调用 Critic，代码保证不会跳过
      const review = await this.callAgent("critic", { 
        solution,
        requirement: this.memory.requirement 
      });
      
      if (review.passed) {
        break; // 通过，退出循环
      }
      
      if (round === 1) {
        // 两轮都未通过，用户介入
        return this.askUserDecision(solution, review.issues);
      }
      
      // Solver 根据 Critic 反馈修改
      solution = await this.callAgent("solver", {
        requirement: this.memory.requirement,
        previousSolution: solution,
        criticFeedback: review.issues
      });
    }
    
    // 1.4 用户确认（LLM 生成友好消息）
    const summary = await this.llmSummarize(solution);
    this.memory.chosenPlan = summary;
    
    const confirmed = await this.askUserConfirm(summary);
    if (!confirmed) return this.restart();
    
    // 生成 request.md
    await this.generateRequestMd();
    
    // ========== Phase 2: 详细规划 ==========
    
    const todolist = await this.callAgent("planner", {
      requirement: this.memory.requirement,
      chosenPlan: this.memory.chosenPlan
    });
    
    const planConfirmed = await this.askUserConfirm(todolist);
    if (!planConfirmed) return this.revisePlan();
    
    await this.generateTodolistMd(todolist);
    
    // ========== Phase 3: 执行与审核 ==========
    
    for (const todo of todolist.todos) {
      // 代码控制：每个 todo 都必须执行，不会跳过
      await this.executeTodo(todo);
    }
    
    // ========== Phase 4: 交付 ==========
    
    return this.generateDeliveryReport();
  }

  private async executeTodo(todo: TodoItem) {
    // 检索相关代码上下文
    const context = await this.ccqEngine.retrieve(todo.content);
    
    // Coder + Reviewer 循环（最多 2 轮）
    for (let round = 0; round < 2; round++) {
      const changes = await this.callAgent("coder", {
        todo,
        context,
        coreMemory: this.memory
      });
      
      // 必须调用 Reviewer，代码保证不会跳过
      const review = await this.callAgent("reviewer", {
        todo,
        changes,
        acceptanceCriteria: todo.acceptance
      });
      
      if (review.passed) {
        await this.applyChanges(changes);
        await this.updateTodoStatus(todo.id, "completed");
        return;
      }
      
      if (round === 1) {
        // 两轮都未通过，标记需要人工处理
        await this.updateTodoStatus(todo.id, "blocked");
        throw new Error(`Todo ${todo.id} failed after 2 attempts`);
      }
    }
  }
}
```

---

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
│  🔵 1.1 上下文检索 (ccq-engine)                                 │
│  🔵 1.2 需求完整性评分 (Analyst Agent)                          │
│     └─ 🟡 <7分则追问用户补充信息                                │
│  🔵 1.3 方案迭代 (Solver + Critic，最多 2 轮)                   │
│  🟡 1.4 用户确认方案 → 生成 request.md                          │
│                                                                 │
│  Phase 2: 详细规划                    输出: todolist.md         │
│  ───────────────────                  ─────────────────         │
│  🔵 2.1 WBS 任务分解 (功能→模块→文件→任务)                       │
│  🔵 2.2 依赖识别 + 工作量估算 (任务点)                           │
│  🟡 2.3 用户确认 → 生成 todolist.md                             │
│                                                                 │
│  Phase 3: 执行与审核                  无需用户介入               │
│  ────────────────────                 ────────────────          │
│  🔵 3.1 单步执行 (每次1个Todo)                                   │
│  🔵 3.2 自动审核 (Reviewer检查)                                  │
│  🔵 3.3 审核不通过 → 自动重做                                   │
│  🔵 3.4 更新 todolist.md 状态 (使用 flowmem todo CLI)           │
│                                                                 │
│  Phase 4: 交付                        输出: 交付报告             │
│  ──────────                           ─────────────             │
│  🔵 4.1 最终审查 (对照验收标准)                                  │
│  🔵 4.2 运行测试 (lsp_diagnostics + npm test)                   │
│  🔵 4.3 生成交付报告                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

**固定介入点**: 方案确认 + 规划确认（2 次）
**可变介入点**: 需求评分追问、中途需求变更、Reviewer 无法自动修复时

> 💡 用户可随时介入调整需求或方向，系统不应限制介入次数。
> 上述流程是"最小介入路径"，不是"唯一路径"。
```

---

### 3.2 Phase 1: 需求澄清

**目标**: 将模糊需求转化为清晰、可执行的 request.md

**输入**: 用户的原始需求描述  
**输出**: `.agentmem/request.md`

#### 步骤 1.1: 上下文检索

```typescript
// ccq-engine 只负责检索，不做分析
const context = await mcp.codebase_retrieval({
  query: userRequest,
  topK: 15
});
// 检索结果提供给主模型分析
```

#### 步骤 1.2: 需求完整性评分（Analyst Agent）

> **设计原则（借鉴 Lyra 4-D 方法论）**: AI 应主动识别缺失信息并追问，而不是让用户猜测 AI 需要什么。

**Analyst 的 4-D 处理流程**:

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

**止损机制**:
- ≥7分: 继续进入方案设计
- <7分: ⛔ 停止，向用户提出 2-3 个针对性问题

**追问策略**:

| 策略 | 说明 | 示例 |
|------|------|------|
| **针对性** | 问具体问题，不要泛泛而问 | ✅ "用户认证用 JWT 还是 Session？" ❌ "还有什么要补充的吗？" |
| **智能默认** | 有些信息可以推断，不必事事都问 | "如无特殊要求，我假设使用项目现有的 REST 风格" |
| **限制数量** | 最多 3 个问题，避免问卷式轰炸 | 优先问影响方案方向的关键问题 |
| **提供选项** | 给出选项比开放式问题更易回答 | "A. 纯后端 API，B. 含前端页面，C. 全栈" |

**Analyst 输出格式**:

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

#### 步骤 1.3: 方案迭代（Solver + Critic）

> 详细机制见 [2.6 Agent 架构 - 方案迭代机制](#方案迭代机制solver--critic)

**简要流程**:
1. Solver 生成方案 V1
2. Critic 审核（检查方向正确性、技术可行性、完整性、风险点）
3. 未通过 → Solver 根据反馈修改 → Critic 再审（最多 2 轮）
4. 通过 → 用户确认

#### 步骤 1.4: 用户确认

**用户操作选项**:
| 操作 | 说明 |
|------|------|
| ✅ 确认 | 直接回复「确认」或「ok」，AI 继续生成 request.md |
| 🔄 调整 | 提出具体修改意见，AI 重新整合 |
| ❌ 否决 | 选择备选方案或要求重新分析 |

**默认行为**: 如果用户 30 秒内无响应且方案明确，AI 可提示「将按推荐方案继续，如需调整请说明」。

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

**输入**: `.agentmem/request.md`  
**输出**: `.agentmem/todolist.md`

#### 步骤 2.1: WBS 任务分解

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
    ├─ 1. 检索上下文 (ccq-engine)
    │      context = codebase_retrieval(todo.content)
    │
    ├─ 2. 执行任务 (主模型)
    │      changes = implement(todo, context)
    │
    ├─ 3. 自动审核 (Reviewer)
    │      result = review(changes, todo.acceptance)
    │
    ├─ 4. 结果处理
    │      if PASS: update_status(completed)
    │      else: retry_or_ask_user()
    │
    └─ 5. 更新进度
```

#### Reviewer 审核清单

| 级别 | 检查项 | 必须通过 |
|------|--------|----------|
| **Critical** | 代码有实际逻辑（非 console.log/TODO） | ✅ |
| **Critical** | lsp_diagnostics 无错误 | ✅ |
| **Critical** | 满足 todo 的 acceptance 条件 | ✅ |
| Major | 代码符合项目规范 | 建议 |
| Major | 错误处理完整 | 建议 |
| Minor | 命名清晰、注释适当 | 可选 |

---

### 3.5 Phase 4: 交付

**目标**: 最终审查并生成交付报告

#### 完成度检查

- 对照 request.md 的验收标准
- 检查所有 todo 状态

#### 测试运行

```bash
lsp_diagnostics   # 类型检查
npm run test      # 单元测试
npm run build     # 构建检查
```

#### 交付报告

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

## 四、辅助机制

### 4.1 MCP 拦截器

防止 AI 绕过规则：

```typescript
// 拦截直接 Edit todolist.md
if (tool === "edit" && filePath.endsWith("todolist.md")) {
  throw new Error("请使用 flowmem todo CLI，禁止直接 Edit");
}
```

### 4.2 Git Pre-commit Hook

```bash
#!/bin/bash
flowmem audit pre-commit || exit 1
```

### 4.3 决策日志

记录每个阶段的决策理由，保存在 `.agentmem/logs/`。

---

## 五、实施计划

### 5.1 任务分解

| 模块 | 任务点 | 预估时间 |
|------|--------|----------|
| Phase 1: 需求澄清 | 9 | 12-15小时 |
| Phase 2: 详细规划 | 5 | 6-8小时 |
| Phase 3: 执行与审核 | 12 | 16-20小时 |
| Phase 4: 交付 | 3 | 4-5小时 |
| 辅助功能 | 5 | 6-8小时 |
| **总计** | **34** | **44-56小时** |

### 5.2 MVP 优先级

**MVP 1（8 任务点）** - 解决最紧迫的偷懒问题：
1. Reviewer 审核逻辑（3点）
2. MCP 拦截器（2点）
3. 需求评分 + 追问机制（3点）

**MVP 2（16 任务点）** - 完整核心流程：
1. MVP 1 全部
2. Solver + Critic 方案迭代（3点）
3. WBS 分解（2点）
4. 执行循环（3点）

---

## 六、预期收益

| 指标 | 现状 | 优化后 | 提升 |
|------|------|--------|------|
| AI 违规率 | 30-40% | <5% | ↓ 85% |
| 代码偷懒率 | 20-30% | <5% | ↓ 80% |
| 需求返工率 | 40% | <15% | ↓ 60% |
| 任务完成可靠性 | 70% | 95% | ↑ 25% |

---

## 七、与现有系统的整合

### 7.1 common-rules.md 更新

在现有规则文件中增加四阶段工作流说明：

```markdown
## 工作流程（四阶段）

### 何时触发？
- 预估修改 ≥3 个文件
- 预估工具调用 ≥10 次
- 用户明确提到"规划"、"设计"

### 流程
1. **需求澄清** → 生成 request.md
2. **详细规划** → 生成 todolist.md  
3. **执行与审核** → 单步执行 + 自动审核
4. **交付** → 生成报告
```

### 7.2 编辑器适配器

在各适配器的 rules.md 中嵌入工作流指令，通过 `build-adapters.sh` 统一生成。

---

## 附录：完整示例

> 详细的用户登录功能示例见 [workflow-example-login.md](./workflow-example-login.md)

---

**结论**: 
- 采用 **四阶段工作流**（需求澄清 → 详细规划 → 执行与审核 → 交付）
- 采用 **多 Agent 架构**（7 个 Agent，同模型独立调用）
- **Orchestrator** 用状态机 + LLM 实现
- **ccq-engine** 只负责检索，Agent 负责分析
- 建议优先实施 **MVP 1**（Reviewer + 拦截器 + 评分机制），快速验证效果后再推进完整架构
