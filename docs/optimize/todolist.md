# FlowMem Workflow 优化方案 - 完整 TodoList

**创建日期**: 2026-01-23  
**总任务点**: 41 点  
**预估总时间**: 52-66 小时  

---

## 概览

| 里程碑 | 目标 | 任务点 | 预估时间 |
|--------|------|--------|----------|
| **MVP 1** | 解决偷懒与绕过 | 8 点 | 10-12 小时 |
| **MVP 2** | 打通完整流程 | 16 点 | 20-25 小时 |
| **GA** | 稳定发布 | 17 点 | 22-29 小时 |

---

## MVP 1 - 解决偷懒与绕过（8 点）

**通过标准**:
- 关键路径可阻断违规
- 能稳定生成 request.md

### LLM 模块

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP1-01 | 实现 LLM 客户端类型定义 | `src/llm/types.ts` | P0 | 0.5h | - |
| MVP1-02 | 实现 LLM 客户端（OpenRouter/Gemini 支持） | `src/llm/client.ts` | P0 | 1.5h | MVP1-01 |
| MVP1-03 | 导出 LLM 模块 | `src/llm/index.ts` | P0 | 0.1h | MVP1-02 |

### Agent 基础设施

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP1-04 | 实现 Agent 类型定义 | `src/agents/types.ts` | P0 | 0.5h | - |
| MVP1-05 | 实现 Agent 基类 | `src/agents/base.ts` | P0 | 1h | MVP1-04, MVP1-02 |
| MVP1-06 | 实现 Agent 注册表 | `src/agents/registry.ts` | P0 | 0.5h | MVP1-05 |

### 核心 Agent

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP1-07 | 实现 Analyst Agent（需求评分、追问机制） | `src/agents/analyst.ts` | P0 | 2h | MVP1-06 |
| MVP1-08 | 实现 Reviewer Agent（偷懒检测、代码审核） | `src/agents/reviewer.ts` | P0 | 2h | MVP1-06 |

### 拦截器模块

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP1-09 | 实现拦截器类型定义 | `src/interceptor/types.ts` | P0 | 0.5h | - |
| MVP1-10 | 实现写入拦截器（受保护文件检测） | `src/interceptor/file-interceptor.ts` | P0 | 1.5h | MVP1-09 |
| MVP1-11 | 实现统一文件管理器 | `src/interceptor/file-manager.ts` | P1 | 1h | MVP1-10 |
| MVP1-12 | 实现审计日志记录器 | `src/interceptor/audit-logger.ts` | P1 | 1h | MVP1-09 |
| MVP1-13 | 导出拦截器模块 | `src/interceptor/index.ts` | P0 | 0.1h | MVP1-12 |

### Memory 骨架

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP1-14 | 实现 Memory 类型定义 | `src/memory/types.ts` | P1 | 0.5h | - |
| MVP1-15 | 实现 Memory 管理器骨架 | `src/memory/manager.ts` | P1 | 1h | MVP1-14 |
| MVP1-16 | 导出 Memory 模块 | `src/memory/index.ts` | P1 | 0.1h | MVP1-15 |

### 验证

| ID | 任务 | 优先级 | 预估 | 依赖 |
|----|------|--------|------|------|
| MVP1-17 | 验证 MVP 1 - TypeScript 类型检查通过 | P0 | 0.5h | 全部 |

---

## MVP 2 - 打通完整流程（16 点）

**通过标准**:
- 端到端流程可跑通
- 高风险变更可升级确认

### 剩余 Agent

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP2-01 | 实现 Solver Agent（方案设计、接受 Critic 反馈） | `src/agents/solver.ts` | P0 | 2h | MVP1-06 |
| MVP2-02 | 实现 Critic Agent（方案审核、问题清单） | `src/agents/critic.ts` | P0 | 2h | MVP1-06 |
| MVP2-03 | 实现 Planner Agent（WBS 分解、依赖分析） | `src/agents/planner.ts` | P0 | 2h | MVP1-06 |
| MVP2-04 | 实现 Coder Agent（代码实现、接受 Reviewer 反馈） | `src/agents/coder.ts` | P0 | 2h | MVP1-06 |
| MVP2-05 | 更新 AgentRegistry - 注册所有 6 个 Agent | `src/agents/registry.ts` | P0 | 0.5h | MVP2-04 |
| MVP2-06 | 导出 Agent 模块 | `src/agents/index.ts` | P0 | 0.1h | MVP2-05 |

### Orchestrator 状态机

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP2-07 | 实现 Orchestrator 类型定义（25 状态） | `src/orchestrator/types.ts` | P0 | 1h | - |
| MVP2-08 | 实现状态转换配置 | `src/orchestrator/transitions.ts` | P0 | 1h | MVP2-07 |
| MVP2-09 | 实现用户交互处理（CLI/MCP） | `src/orchestrator/user-interaction.ts` | P1 | 1.5h | MVP2-07 |
| MVP2-10 | 实现 Orchestrator 主状态机 | `src/orchestrator/orchestrator.ts` | P0 | 3h | MVP2-09, MVP2-06 |
| MVP2-11 | 导出 Orchestrator 模块 | `src/orchestrator/index.ts` | P0 | 0.1h | MVP2-10 |

### Memory 完善

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP2-12 | 实现 TodoList 管理器（状态更新、依赖检查） | `src/memory/todolist-manager.ts` | P1 | 1.5h | MVP1-15 |
| MVP2-13 | 实现 Memory 归纳器（阶段归纳、Token 控制） | `src/memory/summarizers.ts` | P1 | 1.5h | MVP1-15 |

### Context Retriever

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| MVP2-14 | 实现 Context 类型定义 | `src/context/types.ts` | P0 | 0.5h | - |
| MVP2-15 | 实现 ContextRetriever 接口 | `src/context/retriever.ts` | P0 | 0.5h | MVP2-14 |
| MVP2-16 | 实现 SimpleRetriever（降级实现） | `src/context/simple-retriever.ts` | P1 | 1h | MVP2-15 |
| MVP2-17 | 实现 CCQEngineRetriever（可选依赖） | `src/context/ccq-engine-retriever.ts` | P1 | 1.5h | MVP2-15 |
| MVP2-18 | 实现 Retriever 工厂函数 | `src/context/factory.ts` | P1 | 0.5h | MVP2-17 |
| MVP2-19 | 导出 Context 模块 | `src/context/index.ts` | P0 | 0.1h | MVP2-18 |

### 验证

| ID | 任务 | 优先级 | 预估 | 依赖 |
|----|------|--------|------|------|
| MVP2-20 | 验证 MVP 2 - 端到端流程测试 | P0 | 1h | 全部 |

---

## GA - 稳定发布（17 点）

**通过标准**:
- 回归测试通过
- 文档与示例完备

### CLI 命令

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| GA-01 | 实现 CLI 入口（TypeScript 重写） | `src/cli/index.ts` | P1 | 1h | MVP2-10 |
| GA-02 | 实现 workflow 命令组 | `src/cli/commands/workflow.ts` | P1 | 2h | GA-01 |
| GA-03 | 实现 todo 命令组 | `src/cli/commands/todo.ts` | P1 | 1.5h | GA-01 |
| GA-04 | 实现 audit 命令组 | `src/cli/commands/audit.ts` | P1 | 1h | GA-01 |
| GA-05 | 实现 hook 命令组 | `src/cli/commands/hook.ts` | P2 | 1h | GA-01 |

### Git Hook 集成

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| GA-06 | 实现 Git Hook 管理器 | `src/interceptor/git-hooks.ts` | P2 | 1.5h | MVP1-10 |
| GA-07 | 实现 pre-commit 审计逻辑 | `src/interceptor/pre-commit-audit.ts` | P2 | 1h | GA-06 |

### 适配器

| ID | 任务 | 文件 | 优先级 | 预估 | 依赖 |
|----|------|------|--------|------|------|
| GA-08 | 实现适配器类型定义 | `src/adapters/types.ts` | P2 | 0.5h | - |
| GA-09 | 实现适配器构建器 | `src/adapters/builder.ts` | P2 | 2h | GA-08 |
| GA-10 | 实现适配器配置（7 个适配器） | `src/adapters/config.ts` | P2 | 1h | GA-08 |
| GA-11 | 创建/更新适配器模板 | `templates/` | P2 | 1h | GA-09 |
| GA-12 | 导出适配器模块 | `src/adapters/index.ts` | P2 | 0.1h | GA-10 |

### 测试

| ID | 任务 | 优先级 | 预估 | 依赖 |
|----|------|--------|------|------|
| GA-13 | 编写单元测试 - Agents | P1 | 2h | MVP2-06 |
| GA-14 | 编写单元测试 - Orchestrator | P1 | 2h | MVP2-10 |
| GA-15 | 编写单元测试 - Interceptor | P1 | 1h | MVP1-13 |
| GA-16 | 编写集成测试 - E2E 流程 | P1 | 2h | GA-02 |

### 文档与发布

| ID | 任务 | 优先级 | 预估 | 依赖 |
|----|------|--------|------|------|
| GA-17 | 更新 README 与使用文档 | P1 | 1h | GA-16 |
| GA-18 | 发布准备 - CHANGELOG、版本号、package.json | P1 | 0.5h | GA-17 |

---

## 文件结构预览

```
packages/ccq-workflow/src/
├── llm/
│   ├── index.ts
│   ├── types.ts
│   └── client.ts
├── agents/
│   ├── index.ts
│   ├── types.ts
│   ├── base.ts
│   ├── registry.ts
│   ├── analyst.ts
│   ├── solver.ts
│   ├── critic.ts
│   ├── planner.ts
│   ├── coder.ts
│   └── reviewer.ts
├── orchestrator/
│   ├── index.ts
│   ├── types.ts
│   ├── transitions.ts
│   ├── user-interaction.ts
│   └── orchestrator.ts
├── memory/
│   ├── index.ts
│   ├── types.ts
│   ├── manager.ts
│   ├── todolist-manager.ts
│   └── summarizers.ts
├── context/
│   ├── index.ts
│   ├── types.ts
│   ├── retriever.ts
│   ├── simple-retriever.ts
│   ├── ccq-engine-retriever.ts
│   └── factory.ts
├── interceptor/
│   ├── index.ts
│   ├── types.ts
│   ├── file-interceptor.ts
│   ├── file-manager.ts
│   ├── audit-logger.ts
│   ├── git-hooks.ts
│   └── pre-commit-audit.ts
├── adapters/
│   ├── index.ts
│   ├── types.ts
│   ├── builder.ts
│   └── config.ts
└── cli/
    ├── index.ts
    └── commands/
        ├── workflow.ts
        ├── todo.ts
        ├── audit.ts
        └── hook.ts
```

---

## 验收标准汇总

| 模块 | 验收标准 |
|------|----------|
| **Orchestrator** | 必经节点不可跳过；状态可持久化；阶段输出一致 |
| **Agents** | Prompt 结构化；输出可解析；隔离性保证；偷懒检测有效 |
| **Memory** | 核心记忆持久化；阶段归纳；Token 可控 |
| **Interceptor** | 受保护文件拦截有效；高风险可升级；审计日志完整 |
| **CLI** | 命令帮助完整；错误处理正确；CLI 上下文生效 |
| **Adapters** | 7 个适配器全部生成；模板替换正确 |
| **Context** | 无 CCQEngine 可运行；动态加载不硬依赖 |

---

## 依赖图

```
LLM (MVP1-01~03)
    │
    ▼
Agent 基础 (MVP1-04~06)
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
Analyst (MVP1-07)                Reviewer (MVP1-08)
Solver (MVP2-01)                 
Critic (MVP2-02)                 
Planner (MVP2-03)                
Coder (MVP2-04)                  
    │
    ▼
AgentRegistry (MVP2-05~06)
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
Orchestrator (MVP2-07~11)        Context (MVP2-14~19)
    │
    ▼
CLI (GA-01~05)
    │
    ▼
Tests & Docs (GA-13~18)
```

---

## 执行顺序建议

1. **第一阶段**: MVP1-01 → MVP1-06 (LLM + Agent 基础设施)
2. **第二阶段**: MVP1-07, MVP1-08 (Analyst + Reviewer) 并行
3. **第三阶段**: MVP1-09 → MVP1-13 (Interceptor)
4. **第四阶段**: MVP1-14 → MVP1-17 (Memory 骨架 + 验证)
5. **第五阶段**: MVP2-01 → MVP2-06 (剩余 Agent)
6. **第六阶段**: MVP2-07 → MVP2-11 (Orchestrator)
7. **第七阶段**: MVP2-12 → MVP2-20 (Memory 完善 + Context + 验证)
8. **第八阶段**: GA-01 → GA-07 (CLI + Hook)
9. **第九阶段**: GA-08 → GA-12 (Adapters)
10. **第十阶段**: GA-13 → GA-18 (Tests + Docs)
