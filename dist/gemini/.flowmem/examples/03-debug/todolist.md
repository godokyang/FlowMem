# 任务清单：修复内存泄漏 (OOM)

> **问题描述**：生产环境 Node.js 进程每隔 2 小时重启一次，监控显示 Heap 在重启前达到 1.5GB 上限。
> **关联 Issue**：#324

## 关键问题 (Hypothesis)
1. **是否是 EventBus 泄露？** 如果是，监听器数量应线性增长。
2. **是否是 DOM 节点泄露？** 如果是，Detached DOM tree 应有很多。
3. **泄露源头在哪？** 是 `SocketManager` 还是 `OrderController`？

## 已做决策
- **决策 1**: 优先排查 EventBus (后端项目 DOM 泄露概率低)。
- **决策 2**: 暂时关闭 Cluster 模式，方便 heap dump 分析。

## 待办事项

### Phase 1: 复现与定位
- [x] 获取生产环境 Heap Dump (文件已下载到 `tmp/heap-20260108.heapsnapshot`)
- [x] 本地环境压力测试复现
    - [x] 编写压测脚本 `scripts/stress-test.js`
    - [x] 运行压测 10 分钟，观察 `--inspect` 内存变化
    - **结果**：复现成功，内存线性增长。

### Phase 2: 分析与假设
- [x] 分析 Heap Dump (Chrome DevTools)
    - **发现**：`Detached DOM trees` 未发现（后端项目），但 `Closure` 对象数量异常巨大。
    - **嫌疑点**：`EventBus` 监听器只增不减。
- [x] **假设 1**：WebSocket 连接断开时未清理事件监听。
    - [x] 检查 `SocketManager.ts` 代码
    - [x] 编写单元测试验证监听器数量
    - **结论**：验证成立！`socket.on('data', handler)` 在重连时重复绑定。

### Phase 3: 修复
- [ ] 修改 `SocketManager.ts`
    - [ ] 引入 `removeListener` 逻辑
    - [ ] 或者改用 `.once` (如果适用)
- [ ] 验证修复
    - [ ] 再次运行压测脚本
    - [ ] 确认 Heap 稳定在 200MB 以内

### Phase 4: 部署监控
- [ ] 部署到 Staging
- [ ] 观察 24 小时内存曲线

## 执行日志
- **2026-01-08 16:00**: 通过对比两个 Heap Snapshot，明显看到 `SocketHandler` 闭包数量随重连次数线性增加。
- **2026-01-08 16:15**: 定位到代码第 45 行，`initSocket` 方法没有防抖，且未解绑旧事件。

## 遇到的问题
- [ ] 压测工具在高并发下自身崩溃 → **解决方案**：调低并发数，延长测试时间，一样能测出来。
