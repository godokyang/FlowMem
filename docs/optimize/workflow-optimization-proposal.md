# FlowMem Workflow 优化方案

**调研日期**: 2026-01-22  
**参考项目**: ccg-workflow (Multi-Model Collaboration)  
**目标**: 解决 AI 偷懒、约束遗漏、缺乏审核机制等问题

---

## 📊 问题分析

### 当前问题清单

#### 1. AI 容易遗漏约束
**表现**:
- AI 经常忽略 common-rules.md 中的规则
- 债务机制（检索≥3次必须沉淀）经常被违反
- TodoList 格式要求（YAML Frontmatter）被忽略
- 不使用 `flowmem todo` CLI，直接 Edit todolist.md

**根本原因**:
- **规则文件过长** (278 行)，AI 上下文有限
- **被动遵守**：依赖 AI 主动记忆和遵守
- **无强制机制**：没有技术手段阻止违规

#### 2. 缺乏审核机制
**表现**:
- 没有自动检查 AI 是否遵守规则
- `flowmem audit` 只能事后检查，无法实时拦截
- AI 自我审核不可靠（上下文丢失导致遗忘规则）

**根本原因**:
- **缺少主动审核步骤**：工作流中没有内置审核节点
- **依赖 AI 自觉**：指望 AI 记住所有规则

#### 3. AI 偷懒问题
**表现**:
- 函数只写 `console.log('TODO')`  就标记完成
- 复制粘贴代码不思考
- 跳过单元测试
- 使用过度优化的"套路"（如过早抽象）

**根本原因**:
- **缺少质量关卡**：没有代码审查环节
- **单 AI 模式**：没有交叉验证
- **激励错位**：AI 目标是"完成任务"而非"高质量完成"

#### 4. 流程透明度不足
**表现**:
- 用户不知道 AI 在哪个阶段
- TodoList 完成了多少不直观
- 看不到 AI 的思考过程

---

## 🎯 优化方案

### 方案一：多 Agent 协作模式（参考 ccg-workflow）

#### 核心思想

借鉴 ccg-workflow 的架构：

```
Master Agent (Claude - 编排)
     ↓
  ┌──┴──┐
  ↓     ↓
Planner  Reviewer
(规划)   (审核)
  ↓     ↓
  └──┬──┘
     ↓
  Executor
  (执行)
```

#### 架构设计

**1. Planner Agent (规划师)**
- **职责**：需求分析 → WBS 任务分解 → 生成 TodoList
- **输入**：用户需求 + 项目上下文
- **输出**：详细的任务清单（.agentmem/todolist.md）
- **关键**：使用 codebase_retrieval 自动检索上下文，无需手动维护 project.md

**2. Reviewer Agent (审核师)**
- **职责**：代码质量审查 + 规则合规性检查
- **触发时机**：
  - 每个 Todo 完成后
  - 整个任务完成前
- **检查项**：
  - 是否使用 `flowmem todo` CLI（而非直接 Edit）
  - 代码是否有实际逻辑（而非 console.log）
  - 是否遵循债务机制（混合模式下已废除）
  - 单元测试覆盖率
- **输出**：审查报告（Critical/Major/Minor/Suggestion）

**3. Executor Agent (执行师)**
- **职责**：根据 TodoList 执行具体任务
- **模式**：
  - 单步执行（默认）
  - 批量执行（低风险任务）
- **关键**：执行前先调用 codebase_retrieval 检索相关代码

**4. Master Agent (编排师)**
- **职责**：工作流编排 + 决策
- **流程**：
  ```
  1. 接收用户需求
  2. 调用 Planner → 生成 TodoList
  3. 用户确认 TodoList
  4. 循环：
     a. 调用 Executor → 执行 1 个 Todo
     b. 调用 Reviewer → 审查结果
     c. 如果审查不通过 → 回到 a 重做
  5. 所有 Todo 完成 → 调用 Reviewer 做最终审查
  6. 归档任务
  ```

#### 优势

| 问题 | 传统 FlowMem | 多 Agent 模式 |
|------|-------------|--------------|
| AI 遗漏约束 | ❌ 依赖 AI 记忆 | ✅ Reviewer 强制检查 |
| 缺乏审核 | ❌ 事后 audit | ✅ 每步自动审核 |
| AI 偷懒 | ❌ 无拦截 | ✅ Reviewer 拦截低质量代码 |
| 流程透明度 | ❌ 黑盒 | ✅ 每个 Agent 输出可见 |

---

### 方案二：规则自动化执行（技术拦截）

#### 核心思想

将规则从"文档约束"变为"代码约束"，通过技术手段强制执行。

#### 具体措施

**1. Git Pre-commit Hook**

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 检查是否违反规则
flowmem audit pre-commit

if [ $? -ne 0 ]; then
  echo "❌ 提交被拒绝：违反 FlowMem 规则"
  exit 1
fi
```

**检查项**：
- TodoList 格式是否正确（YAML Frontmatter）
- 是否有未完成的 Todo 就提交代码
- 债务是否≥3（混合模式下可选）

**2. MCP Server 拦截器**

创建 `@ccq/workflow-guardian` MCP Server：

```typescript
// 拦截 todowrite 工具
mcp.addTool({
  name: "todowrite",
  handler: () => {
    throw new Error("请使用 `flowmem todo` CLI 命令，禁止直接使用 todowrite");
  }
});

// 拦截直接 Edit todolist.md
mcp.addMiddleware((request) => {
  if (request.tool === "edit" && request.params.filePath.endsWith("todolist.md")) {
    throw new Error("请使用 `flowmem todo` CLI 命令，禁止直接 Edit todolist.md");
  }
});
```

**3. Watcher 模式实时监控**

```bash
# 后台运行审核
flowmem watch

# 监控 .agentmem/ 目录变化
# 发现违规 → 立即警告 AI
```

---

### 方案三：混合模式增强（FlowMem + ccq-engine）

#### 核心思想

当前混合模式已废除债务机制，但仍依赖 AI 主动调用 `codebase_retrieval`。需要更强的自动化。

#### 优化措施

**1. 自动上下文注入**

在 AI 执行每个 Todo 前，自动调用 codebase_retrieval：

```typescript
// packages/ccq-workflow/src/context-injector.ts

export async function injectContext(todo: Todo) {
  // 从 Todo 内容提取关键词
  const keywords = extractKeywords(todo.content);
  
  // 自动调用 codebase_retrieval
  const context = await mcp.codebase_retrieval({
    query: keywords.join(" "),
    topK: 10
  });
  
  // 注入到 AI 上下文
  return {
    todo,
    context,
    instructions: "基于以上上下文执行任务"
  };
}
```

**2. project.md 自动维护**

虽然混合模式下 project.md 可选，但可以自动生成摘要：

```bash
# 定期自动生成 project.md 摘要
flowmem sync-project

# 使用 codebase_ask 生成摘要
ccq ask "总结这个项目的架构和关键约定" > .agentmem/project.md
```

---

### 方案四：工作流可视化

#### 核心思想

让用户实时看到 AI 的执行进度和决策过程。

#### 实现方式

**1. 实时进度条**

```
=== FlowMem 执行中 ===

[████████░░░░░░░░░░░░] 44% (15/34 任务完成)

当前阶段: Phase 3 - 执行 Todo
├─ 当前任务: 实现用户认证 API
├─ 执行者: Executor Agent
├─ 状态: 等待 Reviewer 审核
└─ 预计剩余: 45 分钟

最近操作:
✓ 15:30 - 创建 auth.ts 文件
✓ 15:32 - 实现 login 函数
⏳ 15:35 - Reviewer 审查中...
```

**2. TodoList 自动更新进度**

```yaml
---
meta:
  progress: 44%  # 自动计算
  eta: "45 分钟"  # 基于任务点估算
todos:
  - id: TODO-001
    status: completed
    completed_at: "2026-01-22T15:30:00Z"
    reviewed_by: Reviewer Agent
  - id: TODO-002
    status: in_progress
    started_at: "2026-01-22T15:35:00Z"
```

**3. 决策日志**

```markdown
# .agentmem/task_logs/001-execution-log.md

## 决策记录

### 15:30 - Planner 决策
输入：用户需求 "实现用户认证"
输出：34 个 Todo（12 任务点）
关键决策：
- 使用 JWT 而非 Session（理由：无状态架构）
- 前后端分离（理由：项目已采用 Next.js）

### 15:32 - Executor 执行
任务：TODO-001 创建 auth.ts
上下文检索：找到 5 个相关文件
实际操作：创建文件 + 实现 3 个函数

### 15:35 - Reviewer 审核
审查对象：TODO-001
Critical: 0 | Major: 1 | Minor: 2
问题：缺少错误处理
决策：要求重做
```

---

## 🏗️ 实施方案对比

| 方案 | 复杂度 | 效果 | 实施优先级 |
|------|--------|------|-----------|
| **方案一：多 Agent 协作** | 高 | ⭐⭐⭐⭐⭐ | 🔴 高 - 核心优化 |
| **方案二：规则自动化执行** | 中 | ⭐⭐⭐⭐ | 🟡 中 - 辅助措施 |
| **方案三：混合模式增强** | 低 | ⭐⭐⭐ | 🟢 低 - 渐进优化 |
| **方案四：工作流可视化** | 中 | ⭐⭐⭐ | 🟡 中 - 用户体验 |

---

## 📐 推荐实施路线

### Phase 1: 多 Agent 基础架构（V2.0）

**目标**: 实现 Planner + Reviewer + Executor 分离

**工作量**: 20-30 任务点

**任务分解**:

1. **创建 Agent 框架**
   - [ ] 定义 Agent 接口（IPlanner, IReviewer, IExecutor）
   - [ ] 实现 MasterAgent 编排逻辑
   - [ ] 设计 Agent 间通信协议

2. **实现 Planner Agent**
   - [ ] 创建 `/ccg:plan` 斜杠命令（参考 ccg-workflow）
   - [ ] 集成 codebase_retrieval 自动检索
   - [ ] 实现 WBS 任务分解算法
   - [ ] 输出 .agentmem/todolist.md

3. **实现 Reviewer Agent**
   - [ ] 创建 `/ccg:review` 斜杠命令
   - [ ] 实现规则检查器（TodoList 格式、CLI 使用、代码质量）
   - [ ] 集成 lsp_diagnostics 检查编译错误
   - [ ] 输出审查报告

4. **实现 Executor Agent**
   - [ ] 创建 `/ccg:execute` 斜杠命令
   - [ ] 单步执行逻辑
   - [ ] 集成 codebase_retrieval 自动注入上下文
   - [ ] 调用 Reviewer 审核

5. **实现 MasterAgent 编排**
   - [ ] 创建 `/ccg:workflow` 完整流程命令
   - [ ] Plan → Execute → Review 循环
   - [ ] 异常处理与回滚

### Phase 2: 规则自动化（V2.1）

**目标**: 技术手段强制规则执行

**工作量**: 8-10 任务点

**任务分解**:

1. **Git Hooks**
   - [ ] 实现 pre-commit hook
   - [ ] `flowmem audit pre-commit` 命令
   
2. **MCP 拦截器**
   - [ ] 创建 `@ccq/workflow-guardian` MCP Server
   - [ ] 拦截 todowrite/Edit todolist.md

3. **Watcher 模式**
   - [ ] `flowmem watch` 命令
   - [ ] 实时监控 .agentmem/ 变化

### Phase 3: 混合模式增强（V2.2）

**目标**: 自动化上下文注入

**工作量**: 5-8 任务点

**任务分解**:

1. **自动上下文注入**
   - [ ] context-injector.ts 实现
   - [ ] 关键词提取算法
   
2. **project.md 自动维护**
   - [ ] `flowmem sync-project` 命令
   - [ ] 集成 codebase_ask 生成摘要

### Phase 4: 工作流可视化（V2.3）

**目标**: 用户体验优化

**工作量**: 10-12 任务点

**任务分解**:

1. **实时进度条**
   - [ ] CLI 进度显示组件
   - [ ] todolist.md 自动更新进度
   
2. **决策日志**
   - [ ] task_logs/ 自动记录
   - [ ] 结构化日志格式

---

## 🎯 最小可行方案（MVP）

如果资源有限，优先实现以下核心功能：

### 核心 1: Reviewer Agent（优先级最高）

**理由**: 立即解决 AI 偷懒问题

**实施**:
1. 创建简化版 Reviewer Agent
2. 集成到现有 workflow 的每个 Todo 完成后
3. 检查项：
   - ✅ 代码有实际逻辑（非 console.log）
   - ✅ 使用了 `flowmem todo` CLI
   - ✅ lsp_diagnostics 无错误

**工作量**: 5 任务点

**预期效果**: 拦截 80% 的偷懒行为

### 核心 2: 规则拦截器

**理由**: 技术手段强制规则

**实施**:
1. MCP Server 拦截 todowrite
2. 拦截直接 Edit todolist.md

**工作量**: 3 任务点

**预期效果**: 100% 阻止违规工具使用

---

## 📊 成本收益分析

### 实施成本

| 阶段 | 开发时间 | 维护成本 |
|------|---------|---------|
| Phase 1（多 Agent） | 15-20 小时 | 中等 |
| Phase 2（规则自动化） | 5-8 小时 | 低 |
| Phase 3（混合增强） | 3-5 小时 | 低 |
| Phase 4（可视化） | 8-10 小时 | 低 |
| **总计** | **31-43 小时** | **中等** |

### 预期收益

| 指标 | 现状 | 优化后 | 提升 |
|------|------|--------|------|
| AI 违规率 | 30-40% | \u003c5% | ↓ 85% |
| 代码质量问题 | 20-30% | \u003c10% | ↓ 60% |
| 用户干预次数 | 每 5 个 Todo 1 次 | 每 20 个 Todo 1 次 | ↓ 75% |
| 任务完成可靠性 | 70% | 95% | ↑ 25% |

---

## 🚀 下一步行动

### 立即执行（本周）

1. ✅ 完成本优化方案文档
2. ⏳ **用户确认**：与项目 owner 确认方案可行性
3. ⏳ **MVP 实施**：先实现 Reviewer Agent + 规则拦截器

### 短期（2 周内）

1. 完成 Phase 1: 多 Agent 基础架构
2. 更新文档（common-rules.md 集成 Agent 说明）

### 中期（1 个月内）

1. 完成 Phase 2-4 全部功能
2. Beta 测试与迭代
3. 发布 V2.0

---

## 📚 参考资料

- **ccg-workflow**: https://github.com/fengshao1227/ccg-workflow
  - 多模型协作架构
  - Planner/Reviewer/Executor 分离设计
  - 规划与执行解耦
  
- **FlowMem v2 设计文档**: docs/v2/newDesign/
  - 混合模式设计
  - MCP 集成方案

- **相关技术**:
  - MCP SDK: @modelcontextprotocol/sdk
  - Git Hooks: pre-commit/post-commit
  - CLI 框架: commander/cac

---

**结论**: 采用多 Agent 协作模式 + 规则自动化是解决当前问题的最佳方案。建议优先实施 Reviewer Agent (MVP)，快速验证效果后再推进完整架构。
