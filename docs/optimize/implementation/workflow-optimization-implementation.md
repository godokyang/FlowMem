# FlowMem Workflow 优化方案 v2.7 - 实施方案

**对应设计文档**: `../design/workflow-optimization-proposal.md`

---

## 1. 文档索引

本实施方案按模块拆分为 7 个独立文档：

| 模块 | 文档 | 说明 | 优先级 |
|------|------|------|--------|
| **Orchestrator** | [01-orchestrator.md](./01-orchestrator.md) | 状态机核心、流程控制、用户交互 | P0 |
| **Agents** | [02-agents.md](./02-agents.md) | 6 个 Agent 实现（Analyst/Solver/Critic/Planner/Coder/Reviewer） | P0 |
| **Memory** | [03-memory.md](./03-memory.md) | 核心记忆/阶段记忆/临时记忆管理、审计日志 | P0 |
| **Interceptor** | [04-interceptor.md](./04-interceptor.md) | 写入拦截器、审计日志、Git Hook | P1 |
| **CLI** | [05-cli.md](./05-cli.md) | 工作流/Todo/审计/Hook 命令扩展 | P1 |
| **Adapters** | [06-adapters.md](./06-adapters.md) | 编辑器适配器构建与同步 | P2 |
| **Context Retriever** | [07-context-retriever.md](./07-context-retriever.md) | 代码上下文检索（可选依赖 @ccq/engine） | P0 |

---

## 2. 实施范围

### 2.1 范围内（In Scope）

| 模块 | 具体内容 |
|------|----------|
| Orchestrator | 状态机流程、Agent 调用链路、用户交互处理 |
| Agents | Analyst/Solver/Critic/Planner/Coder/Reviewer 6 个 Agent |
| Memory | 核心记忆持久化、阶段记忆归纳、代码上下文归纳 |
| Interceptor | 受保护文件拦截、高风险变更升级、审计留痕 |
| CLI | workflow/todo/audit/hook 命令组 |
| Adapters | 7 个编辑器适配器规则同步 |
| Context Retriever | 代码上下文检索抽象层、CCQEngine 可选集成、降级策略 |

### 2.2 范围外（Out of Scope）

- 引入新的外部模型提供商
- UI/前端可视化看板
- 与第三方 CI/CD 平台的深度集成
- 多人协作工作流

---

## 3. 里程碑与 MVP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           实施里程碑                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MVP 1 (8 点)                MVP 2 (16 点)               GA                 │
│  ─────────────                ─────────────              ──                  │
│  解决偷懒与绕过               打通完整流程               稳定发布            │
│                                                                             │
│  ┌─────────────┐             ┌─────────────┐            ┌─────────────┐     │
│  │ Reviewer    │             │ MVP 1 全部   │            │ MVP 2 全部   │     │
│  │ 审核逻辑    │             │             │            │             │     │
│  │ (3点)       │             │ Solver+Critic│            │ 配置化策略  │     │
│  ├─────────────┤             │ 迭代 (3点)  │            │             │     │
│  │ 写入拦截器  │             ├─────────────┤            │ 审计留痕    │     │
│  │ (2点)       │             │ WBS 分解    │            │             │     │
│  ├─────────────┤             │ (2点)       │            │ 适配器同步  │     │
│  │ 需求评分    │             ├─────────────┤            │             │     │
│  │ 追问机制    │             │ 执行循环    │            │ 文档完善    │     │
│  │ (3点)       │             │ (3点)       │            │             │     │
│  └─────────────┘             └─────────────┘            └─────────────┘     │
│                                                                             │
│  通过标准:                    通过标准:                  通过标准:           │
│  - 关键路径可阻断违规         - 端到端流程可跑通         - 回归测试通过       │
│  - 能稳定生成 request.md      - 高风险可升级             - 文档与示例完备     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| 里程碑 | 目标 | 交付内容 | 通过标准 |
|--------|------|----------|----------|
| **MVP 1** | 解决偷懒与绕过 | Reviewer 审核、写入拦截器、需求评分追问 | 关键路径可阻断违规；能稳定生成 request.md |
| **MVP 2** | 打通完整流程 | Solver+Critic 迭代、WBS 规划、执行循环 | 端到端流程可跑通；高风险可升级 |
| **GA** | 稳定发布 | 配置化策略、审计留痕、适配器同步 | 回归测试通过；文档与示例完备 |

---

## 4. 模块依赖图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           模块依赖关系                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────┐                                │
│                              │   CLI       │                                │
│                              │ (05-cli)    │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│                      ┌──────────────┼──────────────┐                        │
│                      │              │              │                        │
│                      ▼              ▼              ▼                        │
│              ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│              │ Orchestrator│ │ Interceptor │ │  Adapters   │               │
│              │ (01-)       │ │ (04-)       │ │  (06-)      │               │
│              └──────┬──────┘ └──────┬──────┘ └─────────────┘               │
│                     │               │                                       │
│          ┌──────────┼───────────────┤                                       │
│          │          │               │                                       │
│          ▼          ▼               ▼                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │   Agents    │ │   Memory    │ │ AuditLogger │                           │
│  │   (02-)     │ │   (03-)     │ │ (04-)       │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│          │                                                                  │
│          ▼                                                                  │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │              Context Retriever (07-)                 │                   │
│  │  ┌─────────────────┐    ┌─────────────────┐         │                   │
│  │  │ CCQEngine       │ OR │ SimpleRetriever │         │                   │
│  │  │ (可选依赖)      │    │ (降级实现)      │         │                   │
│  │  └─────────────────┘    └─────────────────┘         │                   │
│  └─────────────────────────────────────────────────────┘                   │
│          │                                                                  │
│          ▼ (可选)                                                           │
│  ┌─────────────┐                                                           │
│  │ @ccq/engine │ (可选外部依赖)                                             │
│  └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 任务拆解与验收

### 5.1 总览

| 模块 | 任务点 | 预估时间 | 验收标准 |
|------|--------|----------|----------|
| Orchestrator | 9 点 | 12-15 小时 | 必经节点不可跳过；阶段输出一致 |
| Agents | 12 点 | 16-20 小时 | Prompt 结构化；偷懒检测有效 |
| Memory | 5 点 | 6-8 小时 | 核心记忆持久化；Token 可控 |
| Interceptor | 5 点 | 6-8 小时 | 受保护文件拦截有效 |
| CLI | 4 点 | 5-6 小时 | 命令帮助完整；错误处理正确 |
| Adapters | 3 点 | 4-5 小时 | 7 个适配器全部生成 |
| Context Retriever | 3 点 | 3-4 小时 | 无 CCQEngine 时可降级运行 |
| **总计** | **41 点** | **52-66 小时** | |

### 5.2 详细验收标准

详见各模块文档：

- [01-orchestrator.md - 验收标准](./01-orchestrator.md#5-验收标准)
- [02-agents.md - 验收标准](./02-agents.md#10-验收标准)
- [03-memory.md - 验收标准](./03-memory.md#8-验收标准)
- [04-interceptor.md - 验收标准](./04-interceptor.md#6-验收标准)
- [05-cli.md - 验收标准](./05-cli.md#6-验收标准)
- [06-adapters.md - 验收标准](./06-adapters.md#8-验收标准)
- [07-context-retriever.md - 验收标准](./07-context-retriever.md#12-验收标准)

---

## 6. 文件结构

```
packages/ccq-workflow/src/
├── orchestrator/               # 状态机核心
│   ├── index.ts
│   ├── types.ts
│   ├── orchestrator.ts
│   ├── user-interaction.ts
│   └── transitions.ts
│
├── agents/                     # 6 个 Agent
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
│
├── memory/                     # Memory 管理
│   ├── index.ts
│   ├── types.ts
│   ├── manager.ts
│   ├── todolist-manager.ts
│   └── summarizers.ts
│
├── context/                    # 代码上下文检索
│   ├── index.ts
│   ├── types.ts
│   ├── retriever.ts            # 抽象接口
│   ├── ccq-engine-retriever.ts # CCQEngine 实现（可选）
│   ├── simple-retriever.ts     # 降级实现
│   └── factory.ts              # 工厂函数
│
├── interceptor/                # 拦截器与审计
│   ├── index.ts
│   ├── types.ts
│   ├── file-interceptor.ts
│   ├── file-manager.ts
│   ├── audit-logger.ts
│   ├── git-hooks.ts
│   └── pre-commit-audit.ts
│
├── adapters/                   # 适配器构建
│   ├── index.ts
│   ├── types.ts
│   ├── builder.ts
│   └── config.ts
│
├── cli/                        # CLI 命令
│   ├── index.ts
│   ├── commands/
│   │   ├── workflow.ts
│   │   ├── todo.ts
│   │   ├── audit.ts
│   │   └── hook.ts
│   └── utils/
│
└── llm/                        # LLM 客户端
    ├── index.ts
    ├── client.ts
    └── types.ts
```

---

## 7. 风险与回滚

### 7.1 主要风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 风险分级误判 | 中 | 频繁打断或漏拦截 | 可配置的风险路径列表 |
| 测试不可跑 | 中 | 流程卡死 | 兜底策略 + 用户确认 |
| Agent 输出不稳定 | 高 | 解析失败 | 严格的 JSON 格式约束 + 重试 |
| 审计日志膨胀 | 低 | 存储压力 | 自动轮转 + 保留天数限制 |
| Token 超限 | 中 | API 调用失败 | Memory 归纳策略 |
| @ccq/engine 未安装 | 中 | 上下文检索质量差 | 降级到 SimpleRetriever + 提示安装 |

### 7.2 回滚策略

```typescript
// 配置开关
export interface FeatureFlags {
  // 降级到旧流程
  useNewWorkflow: boolean;
  
  // 禁用高风险升级
  enableHighRiskEscalation: boolean;
  
  // 禁用自动重试
  enableAutoRetry: boolean;
  
  // 禁用写入拦截
  enableWriteInterceptor: boolean;
}

// 默认配置
const DEFAULT_FLAGS: FeatureFlags = {
  useNewWorkflow: true,
  enableHighRiskEscalation: true,
  enableAutoRetry: true,
  enableWriteInterceptor: true
};
```

**回滚步骤**：

1. 修改 `.agentmem/project.md` 中的 feature flags
2. 重启工作流
3. 保留现有 `.agentmem` 文件结构，不做破坏性改动

---

## 8. 测试计划

### 8.1 测试类型

| 类型 | 覆盖范围 | 工具 |
|------|----------|------|
| **单元测试** | Agent Prompt/Parser、拦截器逻辑、CLI 命令 | Jest |
| **集成测试** | 端到端流程（request.md → todolist.md → 执行 → 交付） | Jest + 真实 LLM |
| **风险测试** | 高风险变更必须触发确认 | Jest + Mock |
| **文档校验** | 规则与示例一致 | 手动 + Snapshot |

### 8.2 关键测试用例

```typescript
describe('E2E Workflow', () => {
  it('should complete full workflow: login feature', async () => {
    const orchestrator = new Orchestrator(deps);
    const result = await orchestrator.run('实现用户登录功能');
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('.agentmem/request.md')).toBe(true);
    expect(fs.existsSync('.agentmem/todolist.md')).toBe(true);
  });
  
  it('should block lazy code', async () => {
    // Coder 产出 console.log('TODO')
    // Reviewer 应该拒绝
  });
  
  it('should escalate high-risk changes', async () => {
    // 修改 auth/ 目录
    // 应该触发用户确认
  });
});
```

---

## 9. 发布计划

### 9.1 发布阶段

| 阶段 | 范围 | 时间 | 产出 |
|------|------|------|------|
| **Alpha** | 内部验证 | 2-3 个真实任务 | Bug 列表、性能数据 |
| **Beta** | 小范围试用 | 有限用户 | 用户反馈、拦截统计 |
| **GA** | 正式发布 | 全量 | npm 包 + 文档 |

### 9.2 发布准入

- [ ] 关键路径测试通过
- [ ] 规则文档与示例一致
- [ ] 回滚策略与配置开关可用
- [ ] CHANGELOG 更新
- [ ] README 更新
- [ ] 适配器重新构建

### 9.3 发布命令

```bash
# 构建
npm run build

# 构建适配器
npm run build:adapters

# 发布
npm publish

# 或使用 lerna
lerna publish
```

---

## 10. 附录

### 10.1 相关文档

- 设计文档: [../design/workflow-optimization-proposal.md](../design/workflow-optimization-proposal.md)
- Lyra 参考: [../lyra.md](../lyra.md)

### 10.2 API 成本预估

| 阶段 | Agent 调用 | 示例（10 个 todo） |
|------|------------|-------------------|
| Phase 1 | 2-4 次 | Analyst + Solver + Critic + [修改] |
| Phase 2 | 1 次 | Planner |
| Phase 3 | 2N 次 | N × (Coder + Reviewer) = 20 |
| Phase 4 | 0 次 | Orchestrator 整合 |
| **总计** | 23-26 次 | |

### 10.3 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-01-22 | 初始版本，6 模块拆分 |
| v1.1 | 2026-01-22 | 新增 07-context-retriever.md，解决 @ccq/engine 可选依赖问题 |
