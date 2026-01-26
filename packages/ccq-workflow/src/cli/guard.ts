/**
 * flowmem guard 命令
 * 用于 Claude Code Hooks 的文件保护检查
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getAgentmemPath, agentmemExists, readFile, writeFile, getTimestamp } from '../utils/file.js';
import type { GuardCheckResult } from '../core/types.js';

// 默认保护文件
const DEFAULT_PROTECTED_FILES = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'tsconfig.json',
  '.gitignore'
];

// 默认高风险路径
const DEFAULT_HIGH_RISK_PATHS = [
  'auth/',
  'security/',
  'migrations/',
  'config/',
  'secrets/',
  '.github/',
  'deploy/'
];

/**
 * 加载项目配置
 */
function loadProjectConfig(): { protectedFiles: string[]; highRiskPaths: string[] } {
  const projectPath = path.join(getAgentmemPath(), 'project.md');
  const content = readFile(projectPath);

  let protectedFiles = [...DEFAULT_PROTECTED_FILES];
  let highRiskPaths = [...DEFAULT_HIGH_RISK_PATHS];

  if (content) {
    // 解析 YAML 配置块
    const yamlMatch = content.match(/```yaml\n([\s\S]*?)```/);
    if (yamlMatch) {
      const yamlContent = yamlMatch[1];

      // 解析 protected_files
      const protectedMatch = yamlContent.match(/protected_files:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (protectedMatch) {
        const files = protectedMatch[1].match(/-\s+"?([^"\n]+)"?/g);
        if (files) {
          protectedFiles = files.map(f => f.replace(/-\s+"?|"?$/g, '').trim());
        }
      }

      // 解析 high_paths
      const highPathsMatch = yamlContent.match(/high_paths:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (highPathsMatch) {
        const paths = highPathsMatch[1].match(/-\s+"?([^"\n]+)"?/g);
        if (paths) {
          highRiskPaths = paths.map(p => p.replace(/-\s+"?|"?$/g, '').trim());
        }
      }
    }
  }

  return { protectedFiles, highRiskPaths };
}

/**
 * 检查文件是否受保护
 */
function isProtectedFile(filePath: string, protectedFiles: string[]): boolean {
  const fileName = path.basename(filePath);
  const relativePath = filePath.startsWith('/') ? filePath : filePath;

  for (const pattern of protectedFiles) {
    // 精确匹配文件名
    if (fileName === pattern) {
      return true;
    }
    // 路径匹配
    if (relativePath.includes(pattern)) {
      return true;
    }
    // glob 模式匹配 (简单实现)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(fileName) || regex.test(relativePath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 检查文件是否在高风险路径
 */
function isHighRiskPath(filePath: string, highRiskPaths: string[]): boolean {
  for (const riskPath of highRiskPaths) {
    if (filePath.includes(riskPath)) {
      return true;
    }
  }
  return false;
}

/**
 * 记录变更日志
 */
function logChange(filePath: string, operation: string, details?: string): void {
  const logsDir = path.join(getAgentmemPath(), 'logs');
  const traceFile = path.join(logsDir, 'trace.jsonl');

  // 确保目录存在
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logEntry = {
    timestamp: getTimestamp(),
    file: filePath,
    operation,
    details
  };

  fs.appendFileSync(traceFile, JSON.stringify(logEntry) + '\n');
}

// 主命令
export const guardCommand = new Command('guard')
  .description('文件保护检查（用于 Claude Code Hooks）');

// check-protected 子命令
guardCommand
  .command('check-protected')
  .description('检查文件是否受保护')
  .argument('<file>', '要检查的文件路径')
  .option('--json', '输出 JSON 格式')
  .action((file, options) => {
    const { protectedFiles } = loadProjectConfig();
    const isProtected = isProtectedFile(file, protectedFiles);

    const result: GuardCheckResult = {
      allowed: !isProtected,
      file,
      reason: isProtected ? '文件受保护，需要用户确认' : undefined,
      rule: isProtected ? 'protected_file' : undefined
    };

    if (options.json) {
      console.log(JSON.stringify(result));
      return;
    }

    if (isProtected) {
      console.log(`🔒 文件受保护: ${file}`);
      console.log('需要用户确认后才能修改');
      process.exit(1);
    } else {
      console.log(`✅ 文件可修改: ${file}`);
    }
  });

// check-risk 子命令
guardCommand
  .command('check-risk')
  .description('检查文件是否在高风险路径')
  .argument('<file>', '要检查的文件路径')
  .option('--json', '输出 JSON 格式')
  .action((file, options) => {
    const { highRiskPaths } = loadProjectConfig();
    const isRisk = isHighRiskPath(file, highRiskPaths);

    const result: GuardCheckResult = {
      allowed: !isRisk,
      file,
      reason: isRisk ? '文件在高风险路径，需要额外审核' : undefined,
      rule: isRisk ? 'high_risk_path' : undefined
    };

    if (options.json) {
      console.log(JSON.stringify(result));
      return;
    }

    if (isRisk) {
      console.log(`⚠️  高风险路径: ${file}`);
      console.log('建议进行额外审核');
      process.exit(1);
    } else {
      console.log(`✅ 路径安全: ${file}`);
    }
  });

// log-change 子命令
guardCommand
  .command('log-change')
  .description('记录文件变更')
  .argument('<file>', '变更的文件路径')
  .option('-o, --operation <op>', '操作类型 (create|modify|delete)', 'modify')
  .option('-d, --details <details>', '变更详情')
  .option('--json', '输出 JSON 格式')
  .action((file, options) => {
    if (!agentmemExists()) {
      // 静默失败，不阻止操作
      if (options.json) {
        console.log(JSON.stringify({ logged: false, reason: 'agentmem not initialized' }));
      }
      return;
    }

    logChange(file, options.operation, options.details);

    if (options.json) {
      console.log(JSON.stringify({ logged: true, file, operation: options.operation }));
    } else {
      console.log(`📝 已记录变更: ${file} (${options.operation})`);
    }
  });

// check 子命令 - 综合检查
guardCommand
  .command('check')
  .description('综合检查文件（保护+风险）')
  .argument('<file>', '要检查的文件路径')
  .option('--json', '输出 JSON 格式')
  .action((file, options) => {
    const { protectedFiles, highRiskPaths } = loadProjectConfig();
    const isProtected = isProtectedFile(file, protectedFiles);
    const isRisk = isHighRiskPath(file, highRiskPaths);

    const result: GuardCheckResult = {
      allowed: !isProtected,
      file,
      reason: isProtected
        ? '文件受保护'
        : isRisk
          ? '高风险路径（允许但需审核）'
          : undefined,
      rule: isProtected ? 'protected_file' : isRisk ? 'high_risk_path' : undefined
    };

    if (options.json) {
      console.log(JSON.stringify({
        ...result,
        isProtected,
        isHighRisk: isRisk
      }));
      return;
    }

    if (isProtected) {
      console.log(`🔒 文件受保护: ${file}`);
      process.exit(1);
    } else if (isRisk) {
      console.log(`⚠️  高风险路径: ${file}`);
      console.log('允许修改，但建议额外审核');
    } else {
      console.log(`✅ 检查通过: ${file}`);
    }
  });

// list-protected 子命令
guardCommand
  .command('list-protected')
  .description('列出所有受保护的文件模式')
  .option('--json', '输出 JSON 格式')
  .action((options) => {
    const { protectedFiles, highRiskPaths } = loadProjectConfig();

    if (options.json) {
      console.log(JSON.stringify({ protectedFiles, highRiskPaths }, null, 2));
      return;
    }

    console.log('🔒 受保护文件:');
    for (const file of protectedFiles) {
      console.log(`  - ${file}`);
    }

    console.log('\n⚠️  高风险路径:');
    for (const path of highRiskPaths) {
      console.log(`  - ${path}`);
    }
  });

// trace 子命令 - 查看变更日志
guardCommand
  .command('trace')
  .description('查看变更日志')
  .option('-n, --lines <n>', '显示最近 N 条记录', '20')
  .option('--json', '输出 JSON 格式')
  .action((options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在');
      process.exit(1);
    }

    const traceFile = path.join(getAgentmemPath(), 'logs', 'trace.jsonl');

    if (!fs.existsSync(traceFile)) {
      console.log('📝 暂无变更记录');
      return;
    }

    const content = readFile(traceFile);
    if (!content) {
      console.log('📝 暂无变更记录');
      return;
    }

    const lines = content.trim().split('\n').filter(Boolean);
    const limit = parseInt(options.lines, 10);
    const recentLines = lines.slice(-limit);

    const entries = recentLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (options.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    console.log(`📝 最近 ${entries.length} 条变更记录:\n`);
    for (const entry of entries) {
      const time = new Date(entry.timestamp).toLocaleString();
      console.log(`  [${time}] ${entry.operation}: ${entry.file}`);
      if (entry.details) {
        console.log(`    → ${entry.details}`);
      }
    }
  });

// check-core-mem 子命令 - 检查核心记忆文件是否存在
guardCommand
  .command('check-core-mem')
  .description('检查核心记忆文件是否存在')
  .option('--json', '输出 JSON 格式')
  .action((options) => {
    const agentmemPath = getAgentmemPath();
    const missing: string[] = [];
    const exists: string[] = [];

    // 检查 .agentmem 目录
    if (!fs.existsSync(agentmemPath)) {
      if (options.json) {
        console.log(JSON.stringify({
          passed: true,
          warning: '.agentmem 目录不存在',
          message: '如需使用四阶段工作流，请先运行 flowmem init'
        }));
      } else {
        console.log('⚠️  .agentmem 目录不存在');
        console.log('如需使用四阶段工作流，请先运行 flowmem init');
      }
      return; // 不阻塞，只警告
    }

    // 检查是否在任务进行中
    const requestExists = fs.existsSync(path.join(agentmemPath, 'request.md'));
    const todolistExists = fs.existsSync(path.join(agentmemPath, 'todolist.md'));

    if (requestExists) exists.push('request.md');
    else missing.push('request.md');

    if (todolistExists) exists.push('todolist.md');
    else missing.push('todolist.md');

    // 如果有任务进行中但缺少文件，发出警告
    const hasTask = requestExists || todolistExists;

    if (options.json) {
      console.log(JSON.stringify({
        passed: true,
        hasTask,
        exists,
        missing: hasTask ? missing : [],
        warning: hasTask && missing.length > 0 ? `缺少核心记忆文件: ${missing.join(', ')}` : undefined
      }));
      return;
    }

    if (hasTask && missing.length > 0) {
      console.log(`⚠️  缺少核心记忆文件: ${missing.join(', ')}`);
      console.log('建议先完成需求澄清阶段');
    } else {
      console.log('✅ 核心记忆文件检查通过');
    }
  });

// check-todo-align 子命令 - 检查变更是否与当前 todo 对齐
guardCommand
  .command('check-todo-align')
  .description('检查变更是否与当前 todo 对齐')
  .argument('<file>', '要检查的文件路径')
  .option('--json', '输出 JSON 格式')
  .action((file, options) => {
    const agentmemPath = getAgentmemPath();
    const todolistPath = path.join(agentmemPath, 'todolist.md');

    // 如果没有 todolist.md，跳过检查
    if (!fs.existsSync(todolistPath)) {
      if (options.json) {
        console.log(JSON.stringify({
          passed: true,
          file,
          currentTodo: null,
          message: '无 todolist.md，跳过对齐检查'
        }));
      } else {
        console.log('✅ 无 todolist.md，跳过对齐检查');
      }
      return;
    }

    const content = readFile(todolistPath);
    if (!content) {
      if (options.json) {
        console.log(JSON.stringify({ passed: true, file, currentTodo: null }));
      } else {
        console.log('✅ todolist.md 为空，跳过对齐检查');
      }
      return;
    }

    // 查找当前进行中的 todo (status: "in_progress" 或 [/] 标记)
    let currentTodo: string | null = null;

    // 尝试匹配 TODO-XXX 格式
    const todoMatch = content.match(/TODO-[\w-]+(?=.*(?:in_progress|\[\/\]))/i);
    if (todoMatch) {
      currentTodo = todoMatch[0];
    } else {
      // 尝试查找任何 TODO-XXX
      const anyTodoMatch = content.match(/TODO-[\w-]+/);
      if (anyTodoMatch) {
        currentTodo = anyTodoMatch[0];
      }
    }

    if (options.json) {
      console.log(JSON.stringify({
        passed: true,
        file,
        currentTodo,
        warning: !currentTodo ? '没有进行中的 todo，但正在修改文件' : undefined
      }));
      return;
    }

    if (!currentTodo) {
      console.log('⚠️  没有进行中的 todo，但正在修改文件');
      console.log('建议先将对应 todo 标记为 in_progress');
    } else {
      console.log(`✅ 当前 todo: ${currentTodo}`);
    }
  });
