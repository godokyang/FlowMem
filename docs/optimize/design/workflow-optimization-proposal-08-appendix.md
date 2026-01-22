# FlowMem Workflow 优化方案 v2.7 - 附录：完整示例

## 附录：完整示例

> 详细的用户登录功能示例见 [workflow-example-login.md](../workflow-example-login.md)

---

**结论**: 
- 采用 **四阶段工作流**（需求澄清 → 详细规划 → 执行与审核 → 交付）
- 采用 **多 Agent 架构**（7 个 Agent，同模型独立调用）
- **Orchestrator** 用状态机 + LLM（同一模型能力）实现
- **ccq-engine** 只负责检索，Agent 负责分析
- 建议优先实施 **MVP 1**（Reviewer + 拦截器 + 评分机制），快速验证效果后再推进完整架构
