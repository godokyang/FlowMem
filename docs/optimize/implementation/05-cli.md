# 实施方案 - 05 CLI 命令扩展

**对应设计文档**: `../design/workflow-optimization-proposal-03-workflow.md`

---

## 1. 模块职责

CLI 命令扩展模块负责：

| 职责 | 说明 |
|------|------|
| **工作流触发** | 启动四阶段工作流 |
| **状态查询** | 查看当前工作流状态 |
| **Todo 管理** | 更新 todo 状态 |
| **审计命令** | 运行审计、查看日志 |
| **Hook 管理** | 安装/卸载 Git hooks |

---

## 2. 命令清单

```
flowmem
├── workflow                    # 工作流命令组
│   ├── start <request>         # 启动工作流
│   ├── status                  # 查看工作流状态
│   ├── resume                  # 恢复中断的工作流
│   └── abort                   # 中止当前工作流
│
├── todo                        # Todo 管理命令组
│   ├── list                    # 列出所有 todo
│   ├── status <id> <status>    # 更新 todo 状态
│   └── show <id>               # 查看 todo 详情
│
├── audit                       # 审计命令组
│   ├── pre-commit              # Pre-commit 审计
│   ├── report [--days N]       # 生成审计报告
│   └── logs [--tail N]         # 查看审计日志
│
├── hook                        # Hook 管理命令组
│   ├── install                 # 安装 Git hooks
│   ├── uninstall               # 卸载 Git hooks
│   └── status                  # 查看 hook 状态
│
└── (现有命令)
    ├── init                    # 初始化项目
    ├── status                  # 查看项目状态
    └── upgrade                 # 升级配置
```

---

## 3. 命令实现

### 3.1 命令基础架构

```typescript
// 文件: packages/ccq-workflow/src/cli/index.ts

import { Command } from 'commander';
import { workflowCommands } from './commands/workflow';
import { todoCommands } from './commands/todo';
import { auditCommands } from './commands/audit';
import { hookCommands } from './commands/hook';

/**
 * 创建 CLI 程序
 */
export function createCli(): Command {
  const program = new Command();
  
  program
    .name('flowmem')
    .description('FlowMem Workflow CLI - AI 上下文记忆管理')
    .version('2.0.0');
  
  // 注册命令组
  program.addCommand(workflowCommands());
  program.addCommand(todoCommands());
  program.addCommand(auditCommands());
  program.addCommand(hookCommands());
  
  // 保留现有命令
  // program.addCommand(initCommand());
  // program.addCommand(statusCommand());
  // ...
  
  return program;
}

// CLI 入口
const cli = createCli();
cli.parse(process.argv);
```

### 3.2 Workflow 命令

```typescript
// 文件: packages/ccq-workflow/src/cli/commands/workflow.ts

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Orchestrator } from '../../orchestrator/orchestrator';
import { CliInteractionHandler } from '../../orchestrator/user-interaction';
import { createDependencies } from '../utils/dependencies';

/**
 * Workflow 命令组
 */
export function workflowCommands(): Command {
  const workflow = new Command('workflow')
    .description('工作流管理命令');
  
  // ========== workflow start ==========
  workflow
    .command('start')
    .description('启动新的工作流')
    .argument('<request>', '需求描述')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .option('--auto-confirm', '自动确认低风险操作', false)
    .action(async (request: string, options) => {
      const spinner = ora('正在初始化工作流...').start();
      
      try {
        const projectRoot = path.resolve(options.project);
        const deps = await createDependencies(projectRoot);
        
        const orchestrator = new Orchestrator({
          ...deps,
          interactionHandler: new CliInteractionHandler(),
          autoConfirm: options.autoConfirm
        });
        
        spinner.succeed('工作流初始化完成');
        
        console.log(chalk.blue('\n📋 开始处理需求:'));
        console.log(chalk.gray(`   "${request}"\n`));
        
        // 启动工作流
        const result = await orchestrator.run(request);
        
        if (result.success) {
          console.log(chalk.green('\n✅ 工作流完成!'));
          console.log(chalk.gray(`   耗时: ${result.durationMs}ms`));
          console.log(chalk.gray(`   完成 todo: ${result.completedTodos}/${result.totalTodos}`));
        } else {
          console.log(chalk.yellow('\n⚠️  工作流未完成'));
          console.log(chalk.gray(`   状态: ${result.finalPhase}`));
          console.log(chalk.gray(`   原因: ${result.reason}`));
        }
      } catch (error) {
        spinner.fail('工作流执行失败');
        console.error(chalk.red(`\n错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== workflow status ==========
  workflow
    .command('status')
    .description('查看当前工作流状态')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      
      try {
        const status = await getWorkflowStatus(projectRoot);
        
        console.log(chalk.blue('\n📊 工作流状态\n'));
        
        console.log(`  阶段: ${formatPhase(status.phase)}`);
        console.log(`  进度: ${status.progress}%`);
        console.log(`  开始时间: ${status.startTime || '未开始'}`);
        
        if (status.currentTodo) {
          console.log(`\n  当前任务:`);
          console.log(`    ID: ${status.currentTodo.id}`);
          console.log(`    内容: ${status.currentTodo.content}`);
        }
        
        if (status.pendingTodos > 0) {
          console.log(`\n  待处理: ${status.pendingTodos} 个任务`);
        }
        
        console.log('');
      } catch (error) {
        console.error(chalk.red(`错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== workflow resume ==========
  workflow
    .command('resume')
    .description('恢复中断的工作流')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (options) => {
      const spinner = ora('正在恢复工作流...').start();
      
      try {
        const projectRoot = path.resolve(options.project);
        const deps = await createDependencies(projectRoot);
        
        // 加载保存的状态
        const savedState = await deps.memoryManager.loadSavedState();
        
        if (!savedState) {
          spinner.fail('没有可恢复的工作流');
          process.exit(1);
        }
        
        const orchestrator = new Orchestrator({
          ...deps,
          interactionHandler: new CliInteractionHandler(),
          initialState: savedState
        });
        
        spinner.succeed('工作流恢复成功');
        
        const result = await orchestrator.run(savedState.userRequest);
        
        if (result.success) {
          console.log(chalk.green('\n✅ 工作流完成!'));
        }
      } catch (error) {
        spinner.fail('恢复失败');
        console.error(chalk.red(`\n错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== workflow abort ==========
  workflow
    .command('abort')
    .description('中止当前工作流')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .option('--force', '强制中止，不保存状态', false)
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      
      try {
        if (!options.force) {
          // 保存当前状态以便后续恢复
          await saveWorkflowState(projectRoot);
          console.log(chalk.yellow('⚠️  工作流已暂停，状态已保存'));
          console.log(chalk.gray('   使用 `flowmem workflow resume` 恢复'));
        } else {
          await clearWorkflowState(projectRoot);
          console.log(chalk.red('🛑 工作流已强制中止，状态已清除'));
        }
      } catch (error) {
        console.error(chalk.red(`错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  return workflow;
}

// ========== 辅助函数 ==========

async function getWorkflowStatus(projectRoot: string): Promise<WorkflowStatus> {
  // 实现状态读取逻辑
  const memoryManager = new MemoryManager(projectRoot);
  const todoManager = new TodoListManager(projectRoot);
  
  // ...
  
  return {
    phase: 'phase3',
    progress: 60,
    startTime: new Date().toISOString(),
    currentTodo: null,
    pendingTodos: 4
  };
}

function formatPhase(phase: string): string {
  const phaseNames: Record<string, string> = {
    'init': '🔵 初始化',
    'phase1': '📝 需求澄清',
    'phase2': '📋 详细规划',
    'phase3': '🔨 执行与审核',
    'phase4': '📦 交付',
    'completed': '✅ 已完成',
    'paused': '⏸️  已暂停',
    'failed': '❌ 失败'
  };
  
  return phaseNames[phase] || phase;
}
```

### 3.3 Todo 命令

```typescript
// 文件: packages/ccq-workflow/src/cli/commands/todo.ts

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { TodoListManager } from '../../memory/todolist-manager';
import { FileInterceptor } from '../../interceptor/file-interceptor';

/**
 * Todo 管理命令组
 */
export function todoCommands(): Command {
  const todo = new Command('todo')
    .description('Todo 列表管理');
  
  // ========== todo list ==========
  todo
    .command('list')
    .description('列出所有 todo')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .option('--status <status>', '按状态筛选', undefined)
    .option('--json', 'JSON 格式输出', false)
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const manager = new TodoListManager(projectRoot);
      
      try {
        const todolist = await manager.load();
        
        if (options.json) {
          console.log(JSON.stringify(todolist, null, 2));
          return;
        }
        
        const progress = manager.getProgress();
        
        console.log(chalk.blue(`\n📋 任务列表 (${progress.completed}/${progress.total})\n`));
        
        for (const item of todolist.todos) {
          if (options.status && item.status !== options.status) {
            continue;
          }
          
          const statusIcon = getStatusIcon(item.status);
          const priorityColor = getPriorityColor(item.priority);
          
          console.log(`  ${statusIcon} ${chalk.bold(item.id)}: ${item.content}`);
          console.log(`     ${priorityColor(`[${item.priority}]`)} ${item.points}点`);
          
          if (item.dependsOn.length > 0) {
            console.log(chalk.gray(`     依赖: ${item.dependsOn.join(', ')}`));
          }
          
          console.log('');
        }
        
        console.log(chalk.gray(`  进度: ${progress.percentage}%\n`));
      } catch (error) {
        console.error(chalk.red(`错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== todo status ==========
  todo
    .command('status')
    .description('更新 todo 状态')
    .argument('<id>', 'Todo ID (如 TODO-001)')
    .argument('<status>', '新状态 (pending|in_progress|completed|blocked)')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (id: string, status: string, options) => {
      const projectRoot = path.resolve(options.project);
      const manager = new TodoListManager(projectRoot);
      
      // 验证状态值
      const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];
      if (!validStatuses.includes(status)) {
        console.error(chalk.red(`无效状态: ${status}`));
        console.error(chalk.gray(`有效值: ${validStatuses.join(', ')}`));
        process.exit(1);
      }
      
      try {
        // 使用 CLI 上下文，允许写入受保护文件
        await FileInterceptor.withCliContext(async () => {
          await manager.updateStatus(id, status as any);
        });
        
        console.log(chalk.green(`✅ ${id} 状态已更新为 ${status}`));
        
        // 显示进度
        const progress = manager.getProgress();
        console.log(chalk.gray(`   进度: ${progress.completed}/${progress.total} (${progress.percentage}%)`));
      } catch (error) {
        console.error(chalk.red(`错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== todo show ==========
  todo
    .command('show')
    .description('查看 todo 详情')
    .argument('<id>', 'Todo ID')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (id: string, options) => {
      const projectRoot = path.resolve(options.project);
      const manager = new TodoListManager(projectRoot);
      
      try {
        const todolist = await manager.load();
        const item = todolist.todos.find(t => t.id === id);
        
        if (!item) {
          console.error(chalk.red(`Todo 不存在: ${id}`));
          process.exit(1);
        }
        
        console.log(chalk.blue(`\n📌 ${item.id}\n`));
        console.log(`  内容: ${item.content}`);
        console.log(`  状态: ${getStatusIcon(item.status)} ${item.status}`);
        console.log(`  优先级: ${getPriorityColor(item.priority)(item.priority)}`);
        console.log(`  工作量: ${item.points} 点`);
        
        if (item.dependsOn.length > 0) {
          console.log(`  依赖: ${item.dependsOn.join(', ')}`);
        }
        
        if (item.files.length > 0) {
          console.log(`  涉及文件:`);
          for (const file of item.files) {
            console.log(chalk.gray(`    - ${file}`));
          }
        }
        
        console.log(`\n  验收条件:`);
        for (const acc of item.acceptance) {
          console.log(chalk.gray(`    - ${acc}`));
        }
        
        console.log('');
      } catch (error) {
        console.error(chalk.red(`错误: ${error.message}`));
        process.exit(1);
      }
    });
  
  return todo;
}

// ========== 辅助函数 ==========

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'pending': '⬜',
    'in_progress': '🔄',
    'completed': '✅',
    'blocked': '❌'
  };
  return icons[status] || '❓';
}

function getPriorityColor(priority: string): (s: string) => string {
  switch (priority) {
    case 'high': return chalk.red;
    case 'medium': return chalk.yellow;
    case 'low': return chalk.gray;
    default: return chalk.white;
  }
}
```

### 3.4 Audit 命令

```typescript
// 文件: packages/ccq-workflow/src/cli/commands/audit.ts

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { PreCommitAuditor } from '../../interceptor/pre-commit-audit';
import { AuditLogger } from '../../interceptor/audit-logger';

/**
 * 审计命令组
 */
export function auditCommands(): Command {
  const audit = new Command('audit')
    .description('审计与日志命令');
  
  // ========== audit pre-commit ==========
  audit
    .command('pre-commit')
    .description('运行 pre-commit 审计（由 Git hook 调用）')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const auditor = new PreCommitAuditor(projectRoot);
      
      const result = await auditor.audit();
      
      console.log(chalk.blue('\n🔍 Pre-commit 审计结果\n'));
      
      for (const check of result.checks) {
        const icon = check.passed ? '✅' : '❌';
        const color = check.passed ? chalk.green : chalk.red;
        
        console.log(`  ${icon} ${color(check.name)}`);
        
        if (check.message) {
          console.log(chalk.gray(`     ${check.message}`));
        }
      }
      
      console.log('');
      
      if (!result.passed) {
        console.log(chalk.red('❌ 审计未通过\n'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ 审计通过\n'));
    });
  
  // ========== audit report ==========
  audit
    .command('report')
    .description('生成审计报告')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .option('--days <n>', '报告天数', '7')
    .option('--json', 'JSON 格式输出', false)
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const logger = new AuditLogger({
        logDir: path.join(projectRoot, '.agentmem', 'logs')
      });
      
      const days = parseInt(options.days);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const report = await logger.generateReport(startDate, endDate);
      
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      
      console.log(chalk.blue(`\n📊 审计报告 (最近 ${days} 天)\n`));
      
      console.log('  摘要:');
      console.log(`    总操作: ${report.summary.totalOperations}`);
      console.log(`    允许: ${chalk.green(report.summary.allowed.toString())}`);
      console.log(`    阻止: ${chalk.red(report.summary.blocked.toString())}`);
      console.log(`    确认: ${chalk.yellow(report.summary.confirmed.toString())}`);
      
      console.log('\n  按操作类型:');
      console.log(`    创建: ${report.byOperation.create}`);
      console.log(`    修改: ${report.byOperation.modify}`);
      console.log(`    删除: ${report.byOperation.delete}`);
      
      console.log('\n  按来源:');
      for (const [source, count] of Object.entries(report.bySource)) {
        console.log(`    ${source}: ${count}`);
      }
      
      if (report.blockedDetails.length > 0) {
        console.log(chalk.red('\n  被阻止的操作:'));
        for (const detail of report.blockedDetails.slice(0, 10)) {
          console.log(chalk.gray(`    ${detail.timestamp}: ${detail.filePath}`));
          console.log(chalk.gray(`      原因: ${detail.reason}`));
        }
        
        if (report.blockedDetails.length > 10) {
          console.log(chalk.gray(`    ... 还有 ${report.blockedDetails.length - 10} 条`));
        }
      }
      
      console.log('');
    });
  
  // ========== audit logs ==========
  audit
    .command('logs')
    .description('查看审计日志')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .option('--tail <n>', '显示最后 N 条', '20')
    .option('--filter <type>', '按类型筛选 (allowed|blocked|confirmed)', undefined)
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const logger = new AuditLogger({
        logDir: path.join(projectRoot, '.agentmem', 'logs')
      });
      
      const limit = parseInt(options.tail);
      
      const records = await logger.query({
        result: options.filter,
        limit
      });
      
      console.log(chalk.blue(`\n📜 审计日志 (最后 ${records.length} 条)\n`));
      
      for (const record of records) {
        const icon = record.result === 'blocked' ? '🚫' : 
                     record.result === 'confirmed' ? '✋' : '✓';
        const color = record.result === 'blocked' ? chalk.red :
                      record.result === 'confirmed' ? chalk.yellow : chalk.gray;
        
        const time = new Date(record.timestamp).toLocaleTimeString();
        
        console.log(`  ${icon} ${time} ${color(record.operation)} ${record.filePath}`);
        
        if (record.details?.reason) {
          console.log(chalk.gray(`     ${record.details.reason}`));
        }
      }
      
      console.log('');
    });
  
  return audit;
}
```

### 3.5 Hook 命令

```typescript
// 文件: packages/ccq-workflow/src/cli/commands/hook.ts

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { GitHookManager } from '../../interceptor/git-hooks';

/**
 * Hook 管理命令组
 */
export function hookCommands(): Command {
  const hook = new Command('hook')
    .description('Git Hook 管理');
  
  // ========== hook install ==========
  hook
    .command('install')
    .description('安装 FlowMem Git hooks')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const manager = new GitHookManager(projectRoot);
      
      try {
        await manager.installPreCommitHook();
        console.log(chalk.green('✅ Pre-commit hook 安装成功'));
        console.log(chalk.gray('   每次提交前会自动运行审计'));
      } catch (error) {
        console.error(chalk.red(`安装失败: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== hook uninstall ==========
  hook
    .command('uninstall')
    .description('卸载 FlowMem Git hooks')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const manager = new GitHookManager(projectRoot);
      
      try {
        await manager.uninstallPreCommitHook();
        console.log(chalk.yellow('⚠️  Pre-commit hook 已卸载'));
      } catch (error) {
        console.error(chalk.red(`卸载失败: ${error.message}`));
        process.exit(1);
      }
    });
  
  // ========== hook status ==========
  hook
    .command('status')
    .description('查看 Git hook 状态')
    .option('-p, --project <path>', '项目路径', process.cwd())
    .action(async (options) => {
      const projectRoot = path.resolve(options.project);
      const manager = new GitHookManager(projectRoot);
      
      const status = await manager.getHookStatus();
      
      console.log(chalk.blue('\n🪝 Git Hook 状态\n'));
      
      console.log(`  Pre-commit:`);
      console.log(`    安装: ${status.installed ? chalk.green('是') : chalk.gray('否')}`);
      
      if (status.installed) {
        console.log(`    类型: ${status.isFlowmemHook ? 'FlowMem' : '其他'}`);
        console.log(`    路径: ${chalk.gray(status.path)}`);
      }
      
      console.log('');
    });
  
  return hook;
}
```

---

## 4. 文件结构

```
packages/ccq-workflow/src/cli/
├── index.ts                    # CLI 入口
├── commands/
│   ├── workflow.ts             # 工作流命令
│   ├── todo.ts                 # Todo 管理命令
│   ├── audit.ts                # 审计命令
│   └── hook.ts                 # Hook 管理命令
└── utils/
    ├── dependencies.ts         # 依赖注入工厂
    ├── output.ts               # 输出格式化
    └── config.ts               # 配置读取
```

---

## 5. 使用示例

```bash
# 启动工作流
flowmem workflow start "实现用户登录功能，使用 JWT 认证"

# 查看状态
flowmem workflow status

# 更新 todo 状态
flowmem todo status TODO-001 completed

# 查看 todo 详情
flowmem todo show TODO-001

# 列出所有待处理 todo
flowmem todo list --status pending

# 安装 Git hook
flowmem hook install

# 运行审计
flowmem audit pre-commit

# 查看审计报告
flowmem audit report --days 7

# 查看最近日志
flowmem audit logs --tail 50
```

---

## 6. 验收标准

| 检查项 | 通过条件 |
|--------|----------|
| **命令帮助** | 所有命令支持 --help |
| **错误处理** | 错误信息清晰，退出码正确 |
| **JSON 输出** | 支持 --json 格式化输出 |
| **CLI 上下文** | todo status 能修改受保护文件 |
| **Hook 安装** | install 后 .git/hooks/pre-commit 存在且可执行 |

---

## 7. 测试要点

```typescript
describe('CLI Commands', () => {
  describe('workflow start', () => {
    it('should initialize and run workflow', async () => {
      // 测试完整工作流启动
    });
  });
  
  describe('todo status', () => {
    it('should update todo via CLI context', async () => {
      // 验证 CLI 上下文能修改 todolist.md
    });
    
    it('should reject invalid status', async () => {
      // 验证无效状态值被拒绝
    });
  });
  
  describe('audit pre-commit', () => {
    it('should exit 1 on failure', async () => {
      // 验证审计失败时退出码为 1
    });
  });
});
```
