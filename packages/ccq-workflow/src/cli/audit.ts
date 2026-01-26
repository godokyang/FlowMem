/**
 * flowmem audit 命令
 * 运行各种审核检查
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getAgentmemPath, agentmemExists, readFile } from '../utils/file.js';
import type { AuditResult } from '../core/types.js';

// 偷懒代码模式
const LAZY_PATTERNS = [
  // 占位符
  { pattern: /console\.log\s*\(\s*['"`]TODO/gi, message: 'console.log TODO 占位符' },
  { pattern: /console\.log\s*\(\s*['"`]FIXME/gi, message: 'console.log FIXME 占位符' },
  { pattern: /\/\/\s*TODO(?!-)/gi, message: 'TODO 注释' },
  { pattern: /\/\/\s*FIXME/gi, message: 'FIXME 注释' },
  { pattern: /\/\*\s*TODO/gi, message: 'TODO 块注释' },

  // 空实现
  { pattern: /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g, message: '空函数实现' },
  { pattern: /=>\s*\{\s*\}/g, message: '空箭头函数' },
  { pattern: /async\s+function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g, message: '空异步函数' },

  // 未实现异常
  { pattern: /throw\s+new\s+Error\s*\(\s*['"`]Not implemented/gi, message: '未实现异常' },
  { pattern: /throw\s+new\s+Error\s*\(\s*['"`]TODO/gi, message: 'TODO 异常' },
  { pattern: /throw\s+['"`]Not implemented/gi, message: '未实现异常' },

  // 硬编码测试数据
  { pattern: /return\s*\{\s*id:\s*1\s*,\s*name:\s*['"`]test['"`]/gi, message: '硬编码测试数据' },
  { pattern: /return\s*['"`]test['"`]/g, message: '返回测试字符串' },

  // pass/skip 占位符
  { pattern: /^\s*pass\s*$/gm, message: 'Python pass 占位符' },
  { pattern: /^\s*\.\.\.$/gm, message: '省略号占位符' }
];

// 默认高风险路径
const DEFAULT_HIGH_RISK_PATHS = [
  'auth/',
  'security/',
  'migrations/',
  'config/',
  '.env'
];

// 默认保护文件
const DEFAULT_PROTECTED_FILES = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.env',
  '.env.local',
  '.env.production'
];

/**
 * 检查偷懒代码
 */
function checkLazyCode(filePath: string, content: string): AuditResult[] {
  const results: AuditResult[] = [];

  for (const { pattern, message } of LAZY_PATTERNS) {
    // 重置正则表达式
    pattern.lastIndex = 0;

    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      results.push({
        type: 'lazy',
        passed: false,
        message: `${filePath}: ${message}`,
        details: matches.slice(0, 3).map(m => m.trim()),
        severity: 'error'
      });
    }
  }

  return results;
}

/**
 * 检查 Todo 完成情况
 */
function checkTodoCompletion(): AuditResult[] {
  const results: AuditResult[] = [];
  const todolistPath = path.join(getAgentmemPath(), 'todolist.md');
  const content = readFile(todolistPath);

  if (!content) {
    results.push({
      type: 'todo',
      passed: true,
      message: '无任务清单',
      severity: 'info'
    });
    return results;
  }

  // 统计任务状态
  const pendingMatches = content.match(/- \[ \]/g) || [];
  const completedMatches = content.match(/- \[x\]/g) || [];

  const pending = pendingMatches.length;
  const completed = completedMatches.length;
  const total = pending + completed;

  if (total === 0) {
    results.push({
      type: 'todo',
      passed: true,
      message: '无任务',
      severity: 'info'
    });
  } else if (pending === 0) {
    results.push({
      type: 'todo',
      passed: true,
      message: `所有任务已完成 (${completed}/${total})`,
      severity: 'info'
    });
  } else {
    results.push({
      type: 'todo',
      passed: false,
      message: `有未完成任务 (${completed}/${total})`,
      details: [`待完成: ${pending}`, `已完成: ${completed}`],
      severity: 'warning'
    });
  }

  return results;
}

/**
 * 检查文件同步状态
 */
function checkSync(): AuditResult[] {
  const results: AuditResult[] = [];
  const agentmemPath = getAgentmemPath();

  // 检查必要文件是否存在
  const requiredFiles = ['project.md', 'todolist.md', 'session.json'];

  for (const file of requiredFiles) {
    const filePath = path.join(agentmemPath, file);
    if (!fs.existsSync(filePath)) {
      results.push({
        type: 'sync',
        passed: false,
        message: `缺少必要文件: ${file}`,
        severity: 'warning'
      });
    }
  }

  // 检查 session.json 是否有效
  const sessionPath = path.join(agentmemPath, 'session.json');
  if (fs.existsSync(sessionPath)) {
    try {
      const sessionContent = readFile(sessionPath);
      if (sessionContent) {
        JSON.parse(sessionContent);
        results.push({
          type: 'sync',
          passed: true,
          message: 'session.json 格式有效',
          severity: 'info'
        });
      }
    } catch {
      results.push({
        type: 'sync',
        passed: false,
        message: 'session.json 格式无效',
        severity: 'error'
      });
    }
  }

  return results;
}

/**
 * 扫描目录中的文件
 */
function scanFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // 跳过 node_modules 和隐藏目录
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...scanFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// 主命令
export const auditCommand = new Command('audit')
  .description('运行审核检查')
  .option('--lazy', '只检查偷懒代码')
  .option('--todo', '只检查任务完成情况')
  .option('--sync', '只检查文件同步状态')
  .option('--all', '运行所有检查（默认）')
  .option('--path <path>', '指定检查路径', '.')
  .option('--json', '输出 JSON 格式')
  .option('--fix', '尝试自动修复（仅限部分问题）')
  .action(async (options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const results: AuditResult[] = [];
    const runAll = options.all || (!options.lazy && !options.todo && !options.sync);

    console.log('🔍 运行审核检查...\n');

    // 检查偷懒代码
    if (runAll || options.lazy) {
      console.log('检查偷懒代码...');

      const targetPath = path.resolve(options.path);
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java'];
      const files = scanFiles(targetPath, extensions);

      let lazyCount = 0;
      for (const file of files) {
        const content = readFile(file);
        if (content) {
          const fileResults = checkLazyCode(file, content);
          results.push(...fileResults);
          lazyCount += fileResults.length;
        }
      }

      if (lazyCount === 0) {
        results.push({
          type: 'lazy',
          passed: true,
          message: '未发现偷懒代码',
          severity: 'info'
        });
      }
    }

    // 检查任务完成情况
    if (runAll || options.todo) {
      console.log('检查任务完成情况...');
      results.push(...checkTodoCompletion());
    }

    // 检查文件同步状态
    if (runAll || options.sync) {
      console.log('检查文件同步状态...');
      results.push(...checkSync());
    }

    // 输出结果
    console.log('');

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    // 分类统计
    const errors = results.filter(r => !r.passed && r.severity === 'error');
    const warnings = results.filter(r => !r.passed && r.severity === 'warning');
    const passed = results.filter(r => r.passed);

    // 输出详情
    if (errors.length > 0) {
      console.log('❌ 错误:');
      for (const result of errors) {
        console.log(`  - [${result.type}] ${result.message}`);
        if (result.details) {
          for (const detail of result.details) {
            console.log(`      ${detail}`);
          }
        }
      }
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('⚠️  警告:');
      for (const result of warnings) {
        console.log(`  - [${result.type}] ${result.message}`);
        if (result.details) {
          for (const detail of result.details) {
            console.log(`      ${detail}`);
          }
        }
      }
      console.log('');
    }

    if (passed.length > 0) {
      console.log('✅ 通过:');
      for (const result of passed) {
        console.log(`  - [${result.type}] ${result.message}`);
      }
      console.log('');
    }

    // 总结
    console.log('─'.repeat(40));
    console.log(`总计: ${results.length} 项检查`);
    console.log(`  ✅ 通过: ${passed.length}`);
    console.log(`  ⚠️  警告: ${warnings.length}`);
    console.log(`  ❌ 错误: ${errors.length}`);

    // 退出码
    if (errors.length > 0) {
      process.exit(1);
    }
  });

// lazy 子命令 - 单独检查偷懒代码
auditCommand
  .command('lazy')
  .description('检查偷懒代码')
  .argument('[path]', '检查路径', '.')
  .option('--json', '输出 JSON 格式')
  .action((targetPath, options) => {
    const resolvedPath = path.resolve(targetPath);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java'];
    const files = scanFiles(resolvedPath, extensions);

    const results: AuditResult[] = [];

    for (const file of files) {
      const content = readFile(file);
      if (content) {
        results.push(...checkLazyCode(file, content));
      }
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log('✅ 未发现偷懒代码');
      return;
    }

    console.log(`❌ 发现 ${results.length} 处偷懒代码:\n`);
    for (const result of results) {
      console.log(`  ${result.message}`);
      if (result.details) {
        for (const detail of result.details) {
          console.log(`    → ${detail}`);
        }
      }
    }

    process.exit(1);
  });

// debt 子命令 - 检查技术债务
auditCommand
  .command('debt')
  .description('检查技术债务')
  .argument('[path]', '检查路径', '.')
  .option('--json', '输出 JSON 格式')
  .action((targetPath, options) => {
    const resolvedPath = path.resolve(targetPath);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java'];
    const files = scanFiles(resolvedPath, extensions);

    const debtPatterns = [
      { pattern: /@deprecated/gi, message: '已废弃代码' },
      { pattern: /HACK:/gi, message: 'HACK 标记' },
      { pattern: /XXX:/gi, message: 'XXX 标记' },
      { pattern: /REFACTOR:/gi, message: '需要重构' },
      { pattern: /eslint-disable/gi, message: 'ESLint 禁用' },
      { pattern: /@ts-ignore/gi, message: 'TypeScript 忽略' },
      { pattern: /@ts-nocheck/gi, message: 'TypeScript 不检查' },
      { pattern: /any(?:\s|;|,|\))/g, message: '使用 any 类型' }
    ];

    const results: { file: string; issues: string[] }[] = [];

    for (const file of files) {
      const content = readFile(file);
      if (!content) continue;

      const issues: string[] = [];
      for (const { pattern, message } of debtPatterns) {
        pattern.lastIndex = 0;
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          issues.push(`${message} (${matches.length}处)`);
        }
      }

      if (issues.length > 0) {
        results.push({ file, issues });
      }
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log('✅ 未发现明显技术债务');
      return;
    }

    console.log(`⚠️  发现技术债务:\n`);
    for (const { file, issues } of results) {
      console.log(`  ${file}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    }
  });
