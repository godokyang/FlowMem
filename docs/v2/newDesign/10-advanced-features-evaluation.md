# 高级功能评估与实施建议

> 评估日期: 2026-01-22  
> 当前版本: V1.0.0  
> 评估对象: V1.5 和 V2 高级功能

---

## 📊 功能优先级评估

### 🔴 高优先级（建议尽快实施）

#### 1. ~~Chunk 级智能复用 (V1.5)~~
**状态**: ❌ 未实现  
**收益**: ⭐⭐⭐⭐⭐ 极高  
**复杂度**: ⭐⭐⭐ 中等  

**问题**：
- 当前实现：文件变更 → 删除所有 chunks → 全部重建
- 实际场景：修改 1 个函数 → 整个文件重新 embedding（耗时 5s+）

**收益分析**：
- ✅ **性能提升**: 单函数修改从 5s 降到 < 500ms (10x)
- ✅ **开发体验**: Watch 模式几乎无感知
- ✅ **CI/CD 友好**: 减少索引时间，加速构建

**建议**: **暂缓实施**  
**原因**:
1. **离线 embedding 已足够快**：Transformers.js 本地计算，单文件 embedding < 1s
2. **复杂度高**：需要实现 AST Diff 算法，容易引入 bug
3. **边际收益递减**：对于大部分项目（< 3k chunks），全量重建也可接受
4. **替代方案**: 使用 `ccq export/import` 缓存索引状态（已实现）

**如果仍需实施**：
```typescript
// 伪代码逻辑
async function indexFile(path, force) {
  const oldChunks = this.chunkDAO.getByPath(path);
  const newChunks = await this.astChunker.chunk(content, path);
  
  // AST Diff: 比对 chunk hash
  const { unchanged, changed, added, removed } = diffChunks(oldChunks, newChunks);
  
  // 只对变更的 chunk 重新 embedding
  const changedTexts = [...changed, ...added].map(c => c.text);
  const vectors = await this.embeddingsProvider.embed(changedTexts);
  
  // 复用未变更的 vectors
  // ...
}
```

---

### 🟡 中优先级（可选实施）

#### 2. 依赖图谱 (V2)
**状态**: ❌ 未实现  
**收益**: ⭐⭐⭐ 中等  
**复杂度**: ⭐⭐⭐⭐ 较高  

**功能描述**：
- 解析 `import/require` 语句构建文件依赖关系
- 追踪函数调用链
- 支持"查找所有引用"功能

**收益分析**：
- ✅ **精准检索**: 查找某函数时自动包含调用方
- ✅ **代码理解**: 可视化模块依赖关系
- ❓ **维护成本**: 需要针对每种语言实现依赖解析

**建议**: **延后至 V2**  
**原因**:
1. **当前 BM25 + Vector 已能覆盖大部分场景**
2. **LSP (Language Server Protocol) 更适合做此功能**
   - VS Code / Cursor 已有内置的"查找引用"功能
   - ccq-engine 不应重复造轮子
3. **复杂度高**：需要解析 25+ 语言的 import 语法
4. **替代方案**: 使用 tree-sitter queries 提取 import，存入 SQLite，按需查询

**如果仍需实施**：
建议先做**轻量级实现**：
```typescript
// 仅提取 import 语句，不解析调用链
async function extractImports(filePath: string) {
  const tree = parser.parse(content);
  const imports = tree.rootNode
    .descendantsOfType('import_statement')
    .map(node => node.text);
  
  // 存入 index_meta 表
  this.metaDAO.set(`imports:${filePath}`, JSON.stringify(imports));
}
```

---

#### 3. Query Expansion (V2)
**状态**: ❌ 未实现  
**收益**: ⭐⭐⭐ 中等  
**复杂度**: ⭐⭐⭐ 中等  

**功能描述**：
- 用户查询 "用户认证" → 自动扩展为 ["用户认证", "login", "auth", "session"]
- 基于依赖图自动包含相关文件

**收益分析**：
- ✅ **召回率提升**: 减少漏召回
- ❓ **精度下降风险**: 过度扩展可能引入噪声

**建议**: **延后至 V2**  
**原因**:
1. **当前 Hybrid Retrieval (BM25 + Vector) 已有较好的召回率**
2. **需要依赖图谱支持**，应在实施功能 2 后再考虑
3. **替代方案**: 用户可以手动指定多个关键词
   ```bash
   ccq context "用户认证 login auth"
   ```

---

### 🟢 低优先级（可暂不实施）

#### 4. 智能缓存 (V1.5)
**状态**: ❌ 未实现  
**收益**: ⭐⭐ 低  
**复杂度**: ⭐⭐ 低  

**功能描述**：
- LRU 缓存问答结果
- 预热常用查询的 embeddings

**建议**: **暂不实施**  
**原因**:
1. **离线 embedding 已足够快**（< 100ms）
2. **缓存失效策略复杂**：代码变更后如何清理缓存？
3. **收益有限**：用户很少重复执行相同查询

---

#### 5. 向量压缩 (V1.5)
**状态**: ❌ 未实现  
**收益**: ⭐⭐ 低  
**复杂度**: ⭐⭐⭐ 中等  

**功能描述**：
- 向量量化（float32 → int8）
- 存储占用从 1.5KB/chunk 降到 384B/chunk

**建议**: **暂不实施**  
**原因**:
1. **当前存储占用可接受**：3k chunks ≈ 7MB（见 04-storage.md）
2. **量化会损失精度**：影响检索质量
3. **收益有限**：硬盘空间不是瓶颈

---

#### 6. 多仓库支持 (V2)
**状态**: ❌ 未实现  
**收益**: ⭐⭐⭐ 中等  
**复杂度**: ⭐⭐⭐⭐⭐ 极高  

**功能描述**：
- 支持索引多个 Git 仓库
- Monorepo 多包独立索引
- 远程仓库自动同步

**建议**: **延后至 V2 或更晚**  
**原因**:
1. **需求场景有限**：大部分项目是单仓库
2. **复杂度极高**：涉及跨仓库依赖解析、增量同步等
3. **替代方案**: 使用多个 `.ccq/` 目录分别索引

---

## 🎯 实施建议总结

### 短期（V1.0 → V1.1）
✅ **优先修复 LSP 错误**（已发现 2 个）
```
packages/ccq-engine/src/retrieval/contextual-enhancer.ts
packages/ccq-engine/src/retrieval/reranker.ts
```

✅ **完善文档**（本次已完成）
- [x] 创建 `packages/ccq-workflow/README.md`
- [x] 更新 `docs/v2/newDesign/06-integration.md`
- [x] 更新 `docs/v2/newDesign/08-roadmap.md`
- [x] 修复 `packages/ccq-engine/package.json` (添加 bin 配置)

✅ **用户体验改进**
- [ ] 添加进度条（索引过程可视化）
- [ ] 改进错误提示（当前错误信息不够友好）
- [ ] 添加 `--dry-run` 选项（预览索引结果）

### 中期（V1.5）
❌ **暂不实施高级功能**
- Chunk 级复用 → 收益低于预期
- 智能缓存 → 边际收益小
- 向量压缩 → 非瓶颈

✅ **关注用户反馈**
- 收集真实使用场景
- 根据痛点决定是否实施高级功能

### 长期（V2）
⏳ **观望技术趋势**
- 依赖图谱 → 如果用户有强需求再考虑
- 多仓库支持 → 评估竞品方案（如 Sourcegraph）

---

## 📝 结论

**当前 V1.0.0 实现已足够成熟，可以投入生产使用。**

**建议策略**：
1. ✅ **立即发布 V1.0.0**（修复 LSP 错误后）
2. ✅ **收集用户反馈** 2-3 个月
3. ⏳ **根据真实需求决定 V1.5 功能**
4. ❌ **暂不投入资源实现 V2 高级功能**

**核心原则**：
> "Make it work, make it right, make it fast"  
> — Kent Beck

当前已处于 **"make it right"** 阶段，无需过早优化。
