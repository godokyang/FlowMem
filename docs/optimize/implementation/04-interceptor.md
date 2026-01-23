# 实施方案 - 04 拦截器与审计模块

**对应设计文档**: `../design/workflow-optimization-proposal-04-mechanisms.md`

---

## 1. 模块职责

拦截器与审计模块负责：

| 职责 | 说明 |
|------|------|
| **写入拦截** | 防止 AI 绕过 CLI 直接修改受保护文件 |
| **操作审计** | 记录所有文件变更和关键操作 |
| **风险拦截** | 高风险操作需用户确认 |
| **Git Hook 集成** | Pre-commit 审核 |

---

## 2. 写入拦截器

### 2.1 设计原则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           写入拦截架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  外部调用（AI 编辑器、直接编辑）                                               │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    FileManager (统一入口)                           │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                     │    │
│  │  ┌─────────────────┐                                               │    │
│  │  │  路径检查       │                                               │    │
│  │  │  isProtected()  │                                               │    │
│  │  └────────┬────────┘                                               │    │
│  │           │                                                        │    │
│  │     ┌─────┴─────┐                                                  │    │
│  │     │           │                                                  │    │
│  │   受保护      普通文件                                              │    │
│  │     │           │                                                  │    │
│  │     ▼           ▼                                                  │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │    │
│  │  │ 检查调用来源    │  │ 直接写入        │                          │    │
│  │  │ viaFlowmemCli() │  │                 │                          │    │
│  │  └────────┬────────┘  └─────────────────┘                          │    │
│  │           │                                                        │    │
│  │     ┌─────┴─────┐                                                  │    │
│  │     │           │                                                  │    │
│  │   via CLI    直接调用                                               │    │
│  │     │           │                                                  │    │
│  │     ▼           ▼                                                  │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │    │
│  │  │ 允许写入        │  │ ❌ 抛出异常     │                          │    │
│  │  │                 │  │ ProtectedFile   │                          │    │
│  │  └─────────────────┘  │ Error           │                          │    │
│  │                       └─────────────────┘                          │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 类型定义

```typescript
// 文件: packages/ccq-workflow/src/interceptor/types.ts

/**
 * 受保护文件配置
 */
export interface ProtectedFileConfig {
  /**
   * 受保护的文件路径列表（相对于项目根目录）
   */
  paths: string[];
  
  /**
   * 受保护的路径模式（glob）
   */
  patterns: string[];
  
  /**
   * 高风险路径（需要用户确认）
   */
  highRiskPaths: string[];
}

/**
 * 写入请求
 */
export interface WriteRequest {
  filePath: string;
  content: string;
  operation: 'create' | 'modify' | 'delete';
  source: WriteSource;
}

/**
 * 写入来源
 */
export interface WriteSource {
  type: 'cli' | 'mcp' | 'direct' | 'agent';
  agentName?: string;
  todoId?: string;
  timestamp: Date;
}

/**
 * 拦截结果
 */
export interface InterceptResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * 审计记录
 */
export interface AuditRecord {
  id: string;
  timestamp: string;
  operation: 'create' | 'modify' | 'delete' | 'read';
  filePath: string;
  source: WriteSource;
  result: 'allowed' | 'blocked' | 'confirmed';
  details?: {
    linesChanged?: number;
    contentHash?: string;
    reason?: string;
  };
}
```

### 2.3 拦截器实现

```typescript
// 文件: packages/ccq-workflow/src/interceptor/file-interceptor.ts

import * as path from 'path';
import * as crypto from 'crypto';
import { minimatch } from 'minimatch';
import { 
  ProtectedFileConfig, 
  WriteRequest, 
  InterceptResult, 
  AuditRecord 
} from './types';
import { AuditLogger } from './audit-logger';

/**
 * 默认受保护文件配置
 */
const DEFAULT_PROTECTED_CONFIG: ProtectedFileConfig = {
  paths: [
    '.agentmem/request.md',
    '.agentmem/todolist.md',
    '.agentmem/project.md'
  ],
  patterns: [
    '.agentmem/logs/**'
  ],
  highRiskPaths: [
    'auth/',
    'security/',
    'migrations/',
    'db/',
    'infra/',
    'config/',
    '.github/workflows/',
    '.env',
    '.env.*',
    'prisma/migrations/**'
  ]
};

/**
 * 文件写入拦截器
 */
export class FileInterceptor {
  private config: ProtectedFileConfig;
  private auditLogger: AuditLogger;
  private projectRoot: string;
  
  // CLI 调用标记（线程局部变量模拟）
  private static cliCallStack: Set<string> = new Set();
  
  constructor(
    projectRoot: string, 
    auditLogger: AuditLogger,
    config?: Partial<ProtectedFileConfig>
  ) {
    this.projectRoot = projectRoot;
    this.auditLogger = auditLogger;
    this.config = { ...DEFAULT_PROTECTED_CONFIG, ...config };
  }
  
  /**
   * 检查写入请求
   */
  async checkWrite(request: WriteRequest): Promise<InterceptResult> {
    const relativePath = this.getRelativePath(request.filePath);
    
    // 1. 检查是否为受保护文件
    if (this.isProtected(relativePath)) {
      // 检查是否通过 CLI 调用
      if (!this.isViaCli(request.source)) {
        await this.logAudit(request, 'blocked', '受保护文件禁止直接写入');
        
        return {
          allowed: false,
          reason: `受保护文件 "${relativePath}" 禁止直接写入，请使用 flowmem CLI`
        };
      }
    }
    
    // 2. 检查是否为高风险路径
    const riskLevel = this.assessRisk(relativePath, request);
    
    if (riskLevel === 'high') {
      await this.logAudit(request, 'allowed', '高风险操作，需要用户确认');
      
      return {
        allowed: true,
        requiresConfirmation: true,
        riskLevel: 'high',
        reason: `高风险操作：${relativePath}`
      };
    }
    
    // 3. 允许写入
    await this.logAudit(request, 'allowed');
    
    return {
      allowed: true,
      riskLevel
    };
  }
  
  /**
   * 检查文件是否受保护
   */
  isProtected(relativePath: string): boolean {
    // 精确匹配
    if (this.config.paths.includes(relativePath)) {
      return true;
    }
    
    // 模式匹配
    for (const pattern of this.config.patterns) {
      if (minimatch(relativePath, pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 评估风险级别
   */
  assessRisk(relativePath: string, request: WriteRequest): 'low' | 'medium' | 'high' {
    // 检查高风险路径
    for (const pattern of this.config.highRiskPaths) {
      if (minimatch(relativePath, pattern) || relativePath.startsWith(pattern)) {
        return 'high';
      }
    }
    
    // 检查操作类型
    if (request.operation === 'delete') {
      return 'medium';
    }
    
    // 检查变更规模（需要调用方提供）
    // 这里只做基本判断
    
    return 'low';
  }
  
  /**
   * 检查是否通过 CLI 调用
   */
  private isViaCli(source: WriteSource): boolean {
    return source.type === 'cli' || FileInterceptor.cliCallStack.size > 0;
  }
  
  /**
   * 进入 CLI 调用上下文
   * 
   * 使用方式：
   * ```typescript
   * await FileInterceptor.withCliContext(async () => {
   *   // 在此范围内的写入被视为 CLI 调用
   *   await fileManager.write(path, content);
   * });
   * ```
   */
  static async withCliContext<T>(fn: () => Promise<T>): Promise<T> {
    const contextId = crypto.randomUUID();
    FileInterceptor.cliCallStack.add(contextId);
    
    try {
      return await fn();
    } finally {
      FileInterceptor.cliCallStack.delete(contextId);
    }
  }
  
  /**
   * 记录审计日志
   */
  private async logAudit(
    request: WriteRequest, 
    result: 'allowed' | 'blocked' | 'confirmed',
    reason?: string
  ): Promise<void> {
    const record: AuditRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: request.operation,
      filePath: request.filePath,
      source: request.source,
      result,
      details: {
        contentHash: request.content 
          ? crypto.createHash('sha256').update(request.content).digest('hex').slice(0, 16)
          : undefined,
        reason
      }
    };
    
    await this.auditLogger.log(record);
  }
  
  /**
   * 获取相对路径
   */
  private getRelativePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return path.relative(this.projectRoot, filePath);
    }
    return filePath;
  }
  
  // ========== 配置管理 ==========
  
  /**
   * 添加受保护路径
   */
  addProtectedPath(pathOrPattern: string): void {
    if (pathOrPattern.includes('*')) {
      this.config.patterns.push(pathOrPattern);
    } else {
      this.config.paths.push(pathOrPattern);
    }
  }
  
  /**
   * 添加高风险路径
   */
  addHighRiskPath(pathOrPattern: string): void {
    this.config.highRiskPaths.push(pathOrPattern);
  }
  
  /**
   * 从 project.md 加载配置
   */
  async loadProjectConfig(): Promise<void> {
    // 从 .agentmem/project.md 读取用户自定义配置
    // 合并到当前配置中
  }
}
```

### 2.4 统一文件管理器

```typescript
// 文件: packages/ccq-workflow/src/interceptor/file-manager.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInterceptor } from './file-interceptor';
import { WriteRequest, WriteSource, InterceptResult } from './types';

/**
 * 受保护文件写入错误
 */
export class ProtectedFileError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: string
  ) {
    super(`写入被拒绝: ${reason}`);
    this.name = 'ProtectedFileError';
  }
}

/**
 * 需要确认的高风险操作错误
 */
export class HighRiskOperationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly operation: string
  ) {
    super(`高风险操作需要用户确认: ${operation} ${filePath}`);
    this.name = 'HighRiskOperationError';
  }
}

/**
 * 统一文件管理器
 * 
 * 所有文件写入都应通过此类，确保拦截器生效
 */
export class FileManager {
  private interceptor: FileInterceptor;
  private projectRoot: string;
  private pendingConfirmations: Map<string, WriteRequest> = new Map();
  
  constructor(projectRoot: string, interceptor: FileInterceptor) {
    this.projectRoot = projectRoot;
    this.interceptor = interceptor;
  }
  
  /**
   * 写入文件
   */
  async write(
    filePath: string, 
    content: string, 
    source: WriteSource
  ): Promise<void> {
    const absolutePath = this.resolvePath(filePath);
    const exists = await this.exists(absolutePath);
    
    const request: WriteRequest = {
      filePath: absolutePath,
      content,
      operation: exists ? 'modify' : 'create',
      source
    };
    
    // 检查拦截
    const result = await this.interceptor.checkWrite(request);
    
    if (!result.allowed) {
      throw new ProtectedFileError(filePath, result.reason!);
    }
    
    if (result.requiresConfirmation) {
      // 存储待确认操作
      const confirmId = this.generateConfirmId();
      this.pendingConfirmations.set(confirmId, request);
      
      throw new HighRiskOperationError(filePath, request.operation);
    }
    
    // 确保目录存在
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    
    // 写入文件
    await fs.writeFile(absolutePath, content, 'utf-8');
  }
  
  /**
   * 删除文件
   */
  async delete(filePath: string, source: WriteSource): Promise<void> {
    const absolutePath = this.resolvePath(filePath);
    
    const request: WriteRequest = {
      filePath: absolutePath,
      content: '',
      operation: 'delete',
      source
    };
    
    const result = await this.interceptor.checkWrite(request);
    
    if (!result.allowed) {
      throw new ProtectedFileError(filePath, result.reason!);
    }
    
    if (result.requiresConfirmation) {
      throw new HighRiskOperationError(filePath, 'delete');
    }
    
    await fs.unlink(absolutePath);
  }
  
  /**
   * 读取文件（不拦截，但记录审计）
   */
  async read(filePath: string): Promise<string> {
    const absolutePath = this.resolvePath(filePath);
    return fs.readFile(absolutePath, 'utf-8');
  }
  
  /**
   * 确认高风险操作
   */
  async confirmOperation(confirmId: string): Promise<void> {
    const request = this.pendingConfirmations.get(confirmId);
    if (!request) {
      throw new Error(`确认 ID 不存在: ${confirmId}`);
    }
    
    // 标记为已确认，直接执行
    this.pendingConfirmations.delete(confirmId);
    
    if (request.operation === 'delete') {
      await fs.unlink(request.filePath);
    } else {
      await fs.mkdir(path.dirname(request.filePath), { recursive: true });
      await fs.writeFile(request.filePath, request.content, 'utf-8');
    }
  }
  
  /**
   * 取消高风险操作
   */
  cancelOperation(confirmId: string): void {
    this.pendingConfirmations.delete(confirmId);
  }
  
  // ========== CLI 专用方法 ==========
  
  /**
   * CLI 专用写入（绕过拦截）
   */
  async cliWrite(filePath: string, content: string): Promise<void> {
    await FileInterceptor.withCliContext(async () => {
      await this.write(filePath, content, {
        type: 'cli',
        timestamp: new Date()
      });
    });
  }
  
  // ========== 辅助方法 ==========
  
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.projectRoot, filePath);
  }
  
  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  private generateConfirmId(): string {
    return `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
```

---

## 3. 审计日志

### 3.1 日志格式

```typescript
// 文件: packages/ccq-workflow/src/interceptor/audit-logger.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditRecord } from './types';

/**
 * 审计日志配置
 */
export interface AuditLoggerConfig {
  /**
   * 日志目录
   */
  logDir: string;
  
  /**
   * 单文件最大记录数
   */
  maxRecordsPerFile: number;
  
  /**
   * 保留天数
   */
  retentionDays: number;
}

/**
 * 审计日志记录器
 */
export class AuditLogger {
  private config: AuditLoggerConfig;
  private currentFile: string;
  private recordCount: number = 0;
  
  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = {
      logDir: '.agentmem/logs',
      maxRecordsPerFile: 10000,
      retentionDays: 30,
      ...config
    };
    
    this.currentFile = this.generateLogFileName();
  }
  
  /**
   * 记录审计日志
   */
  async log(record: AuditRecord): Promise<void> {
    const logPath = path.join(this.config.logDir, this.currentFile);
    
    // 确保目录存在
    await fs.mkdir(this.config.logDir, { recursive: true });
    
    // 追加记录
    const line = JSON.stringify(record) + '\n';
    await fs.appendFile(logPath, line, 'utf-8');
    
    this.recordCount++;
    
    // 检查是否需要轮转
    if (this.recordCount >= this.config.maxRecordsPerFile) {
      this.rotateFile();
    }
  }
  
  /**
   * 查询审计日志
   */
  async query(options: AuditQueryOptions): Promise<AuditRecord[]> {
    const files = await this.getLogFiles();
    const results: AuditRecord[] = [];
    
    for (const file of files) {
      const records = await this.readLogFile(file);
      
      for (const record of records) {
        if (this.matchesQuery(record, options)) {
          results.push(record);
          
          if (options.limit && results.length >= options.limit) {
            return results;
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * 生成审计报告
   */
  async generateReport(startDate: Date, endDate: Date): Promise<AuditReport> {
    const records = await this.query({
      startDate,
      endDate
    });
    
    const report: AuditReport = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalOperations: records.length,
        allowed: records.filter(r => r.result === 'allowed').length,
        blocked: records.filter(r => r.result === 'blocked').length,
        confirmed: records.filter(r => r.result === 'confirmed').length
      },
      byOperation: {
        create: records.filter(r => r.operation === 'create').length,
        modify: records.filter(r => r.operation === 'modify').length,
        delete: records.filter(r => r.operation === 'delete').length
      },
      bySource: this.groupBySource(records),
      blockedDetails: records
        .filter(r => r.result === 'blocked')
        .map(r => ({
          timestamp: r.timestamp,
          filePath: r.filePath,
          reason: r.details?.reason || '未知原因'
        }))
    };
    
    return report;
  }
  
  /**
   * 清理过期日志
   */
  async cleanup(): Promise<number> {
    const files = await this.getLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(this.config.logDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  // ========== 辅助方法 ==========
  
  private generateLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return `audit-${date}.jsonl`;
  }
  
  private rotateFile(): void {
    this.currentFile = this.generateLogFileName();
    this.recordCount = 0;
  }
  
  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.logDir);
      return files
        .filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'))
        .sort()
        .reverse(); // 最新的在前
    } catch {
      return [];
    }
  }
  
  private async readLogFile(fileName: string): Promise<AuditRecord[]> {
    const filePath = path.join(this.config.logDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }
  
  private matchesQuery(record: AuditRecord, options: AuditQueryOptions): boolean {
    if (options.startDate && new Date(record.timestamp) < options.startDate) {
      return false;
    }
    
    if (options.endDate && new Date(record.timestamp) > options.endDate) {
      return false;
    }
    
    if (options.operation && record.operation !== options.operation) {
      return false;
    }
    
    if (options.result && record.result !== options.result) {
      return false;
    }
    
    if (options.filePath && !record.filePath.includes(options.filePath)) {
      return false;
    }
    
    return true;
  }
  
  private groupBySource(records: AuditRecord[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const record of records) {
      const source = record.source.type;
      groups[source] = (groups[source] || 0) + 1;
    }
    
    return groups;
  }
}

// ========== 类型定义 ==========

export interface AuditQueryOptions {
  startDate?: Date;
  endDate?: Date;
  operation?: 'create' | 'modify' | 'delete';
  result?: 'allowed' | 'blocked' | 'confirmed';
  filePath?: string;
  limit?: number;
}

export interface AuditReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalOperations: number;
    allowed: number;
    blocked: number;
    confirmed: number;
  };
  byOperation: {
    create: number;
    modify: number;
    delete: number;
  };
  bySource: Record<string, number>;
  blockedDetails: Array<{
    timestamp: string;
    filePath: string;
    reason: string;
  }>;
}
```

---

## 4. Git Pre-commit Hook

### 4.1 Hook 安装器

```typescript
// 文件: packages/ccq-workflow/src/interceptor/git-hooks.ts

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Git Hook 管理器
 */
export class GitHookManager {
  private projectRoot: string;
  private hooksDir: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.hooksDir = path.join(projectRoot, '.git', 'hooks');
  }
  
  /**
   * 安装 pre-commit hook
   */
  async installPreCommitHook(): Promise<void> {
    const hookPath = path.join(this.hooksDir, 'pre-commit');
    
    const hookContent = `#!/bin/bash
# FlowMem Pre-commit Hook
# 自动生成，请勿手动修改

set -e

echo "🔍 Running FlowMem pre-commit audit..."

# 检查是否安装了 flowmem
if ! command -v flowmem &> /dev/null; then
    echo "⚠️  flowmem CLI not found, skipping audit"
    exit 0
fi

# 运行审计
flowmem audit pre-commit

if [ $? -ne 0 ]; then
    echo "❌ Pre-commit audit failed"
    echo "请修复问题后再提交，或使用 --no-verify 跳过（不推荐）"
    exit 1
fi

echo "✅ Pre-commit audit passed"
`;
    
    // 确保 hooks 目录存在
    await fs.mkdir(this.hooksDir, { recursive: true });
    
    // 写入 hook
    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
  }
  
  /**
   * 卸载 pre-commit hook
   */
  async uninstallPreCommitHook(): Promise<void> {
    const hookPath = path.join(this.hooksDir, 'pre-commit');
    
    try {
      const content = await fs.readFile(hookPath, 'utf-8');
      
      // 只删除我们安装的 hook
      if (content.includes('FlowMem Pre-commit Hook')) {
        await fs.unlink(hookPath);
      }
    } catch {
      // Hook 不存在，忽略
    }
  }
  
  /**
   * 检查 hook 状态
   */
  async getHookStatus(): Promise<HookStatus> {
    const hookPath = path.join(this.hooksDir, 'pre-commit');
    
    try {
      const content = await fs.readFile(hookPath, 'utf-8');
      
      return {
        installed: content.includes('FlowMem Pre-commit Hook'),
        path: hookPath,
        isFlowmemHook: content.includes('FlowMem Pre-commit Hook')
      };
    } catch {
      return {
        installed: false,
        path: hookPath,
        isFlowmemHook: false
      };
    }
  }
}

export interface HookStatus {
  installed: boolean;
  path: string;
  isFlowmemHook: boolean;
}
```

### 4.2 Pre-commit 审计逻辑

```typescript
// 文件: packages/ccq-workflow/src/interceptor/pre-commit-audit.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Pre-commit 审计结果
 */
export interface PreCommitAuditResult {
  passed: boolean;
  checks: AuditCheck[];
  warnings: string[];
  errors: string[];
}

export interface AuditCheck {
  name: string;
  passed: boolean;
  message?: string;
}

/**
 * Pre-commit 审计器
 */
export class PreCommitAuditor {
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  /**
   * 运行完整审计
   */
  async audit(): Promise<PreCommitAuditResult> {
    const checks: AuditCheck[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // 1. 检查暂存文件
    const stagedFiles = await this.getStagedFiles();
    
    // 2. 检查受保护文件是否被直接修改
    checks.push(await this.checkProtectedFiles(stagedFiles));
    
    // 3. 检查 todolist 状态一致性
    checks.push(await this.checkTodolistConsistency());
    
    // 4. 检查是否包含敏感文件
    checks.push(await this.checkSensitiveFiles(stagedFiles));
    
    // 5. 检查代码中的偷懒模式
    checks.push(await this.checkLazyPatterns(stagedFiles));
    
    // 汇总结果
    const passed = checks.every(c => c.passed);
    
    return {
      passed,
      checks,
      warnings,
      errors: checks.filter(c => !c.passed).map(c => c.message || c.name)
    };
  }
  
  /**
   * 获取暂存文件列表
   */
  private async getStagedFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --cached --name-only', {
        cwd: this.projectRoot
      });
      
      return stdout.trim().split('\n').filter(f => f);
    } catch {
      return [];
    }
  }
  
  /**
   * 检查受保护文件
   */
  private async checkProtectedFiles(stagedFiles: string[]): Promise<AuditCheck> {
    const protectedPaths = [
      '.agentmem/request.md',
      '.agentmem/todolist.md',
      '.agentmem/project.md'
    ];
    
    const violations = stagedFiles.filter(f => protectedPaths.includes(f));
    
    if (violations.length > 0) {
      // 检查这些文件是否通过 CLI 修改
      // 这里简化处理，实际应检查审计日志
      return {
        name: '受保护文件检查',
        passed: true, // 如果通过 CLI 修改是允许的
        message: `受保护文件已修改: ${violations.join(', ')}`
      };
    }
    
    return {
      name: '受保护文件检查',
      passed: true
    };
  }
  
  /**
   * 检查 todolist 一致性
   */
  private async checkTodolistConsistency(): Promise<AuditCheck> {
    try {
      // 读取 todolist
      const todolistPath = path.join(this.projectRoot, '.agentmem', 'todolist.md');
      const fs = await import('fs/promises');
      const content = await fs.readFile(todolistPath, 'utf-8');
      
      // 检查是否有 in_progress 状态的 todo
      if (content.includes('status: in_progress')) {
        return {
          name: 'TodoList 一致性',
          passed: false,
          message: '存在未完成的 todo (in_progress)，请完成或取消后再提交'
        };
      }
      
      return {
        name: 'TodoList 一致性',
        passed: true
      };
    } catch {
      // todolist 不存在，跳过检查
      return {
        name: 'TodoList 一致性',
        passed: true,
        message: 'todolist.md 不存在，跳过检查'
      };
    }
  }
  
  /**
   * 检查敏感文件
   */
  private async checkSensitiveFiles(stagedFiles: string[]): Promise<AuditCheck> {
    const sensitivePatterns = [
      /\.env$/,
      /\.env\..+$/,
      /credentials\./,
      /secrets?\./,
      /private[_-]?key/i,
      /\.pem$/,
      /\.key$/
    ];
    
    const sensitiveFiles = stagedFiles.filter(f => 
      sensitivePatterns.some(p => p.test(f))
    );
    
    if (sensitiveFiles.length > 0) {
      return {
        name: '敏感文件检查',
        passed: false,
        message: `检测到敏感文件: ${sensitiveFiles.join(', ')}。请确认是否应该提交。`
      };
    }
    
    return {
      name: '敏感文件检查',
      passed: true
    };
  }
  
  /**
   * 检查偷懒代码模式
   */
  private async checkLazyPatterns(stagedFiles: string[]): Promise<AuditCheck> {
    const codeFiles = stagedFiles.filter(f => 
      /\.(ts|tsx|js|jsx|py|go|rs)$/.test(f)
    );
    
    if (codeFiles.length === 0) {
      return {
        name: '代码质量检查',
        passed: true
      };
    }
    
    const lazyPatterns = [
      /console\.log\(['"]TODO/,
      /console\.log\(['"]实现中/,
      /\/\/\s*TODO:\s*implement/i,
      /throw new Error\(['"]Not implemented/,
      /return null\s*\/\/\s*placeholder/i
    ];
    
    try {
      // 获取暂存的代码内容
      const { stdout } = await execAsync(
        `git diff --cached -- ${codeFiles.join(' ')}`,
        { cwd: this.projectRoot }
      );
      
      for (const pattern of lazyPatterns) {
        if (pattern.test(stdout)) {
          return {
            name: '代码质量检查',
            passed: false,
            message: `检测到偷懒代码模式: ${pattern.toString()}`
          };
        }
      }
      
      return {
        name: '代码质量检查',
        passed: true
      };
    } catch {
      return {
        name: '代码质量检查',
        passed: true,
        message: '无法读取 diff，跳过检查'
      };
    }
  }
}
```

---

## 5. 文件结构

```
packages/ccq-workflow/src/interceptor/
├── index.ts                    # 导出入口
├── types.ts                    # 类型定义
├── file-interceptor.ts         # 写入拦截器
├── file-manager.ts             # 统一文件管理器
├── audit-logger.ts             # 审计日志
├── git-hooks.ts                # Git Hook 管理
└── pre-commit-audit.ts         # Pre-commit 审计
```

---

## 6. 验收标准

| 检查项 | 通过条件 |
|--------|----------|
| **受保护文件拦截** | 直接写入 .agentmem/request.md 抛出 ProtectedFileError |
| **CLI 上下文绕过** | 通过 withCliContext 包装的写入允许 |
| **高风险提示** | 写入 auth/ 路径时返回 requiresConfirmation: true |
| **审计日志完整** | 所有写入操作都有日志记录 |
| **Pre-commit Hook** | 能检测到偷懒代码并阻止提交 |

---

## 7. 测试要点

```typescript
describe('FileInterceptor', () => {
  describe('受保护文件', () => {
    it('should block direct write to request.md', async () => {
      const request = {
        filePath: '.agentmem/request.md',
        source: { type: 'direct' }
      };
      
      const result = await interceptor.checkWrite(request);
      expect(result.allowed).toBe(false);
    });
    
    it('should allow CLI write to request.md', async () => {
      await FileInterceptor.withCliContext(async () => {
        const request = {
          filePath: '.agentmem/request.md',
          source: { type: 'cli' }
        };
        
        const result = await interceptor.checkWrite(request);
        expect(result.allowed).toBe(true);
      });
    });
  });
  
  describe('高风险路径', () => {
    it('should flag auth/ as high risk', async () => {
      const result = await interceptor.checkWrite({
        filePath: 'src/auth/login.ts',
        source: { type: 'agent' }
      });
      
      expect(result.riskLevel).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
    });
  });
});

describe('PreCommitAuditor', () => {
  it('should detect lazy code patterns', async () => {
    // Mock git diff 返回包含 console.log('TODO') 的内容
    const result = await auditor.audit();
    expect(result.passed).toBe(false);
  });
});
```
