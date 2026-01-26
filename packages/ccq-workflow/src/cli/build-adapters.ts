/**
 * flowmem build-adapters 命令
 * 构建各 IDE 的适配器包
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { ensureDir, readFile, writeFile } from '../utils/file.js';

// 适配器配置
interface AdapterConfig {
  name: string;
  ruleFile: string;
  assetsDir: string;
  specialStructure?: boolean;
  useCommands?: boolean;  // 是否使用 commands 模式（Claude Code）
}

const ADAPTERS: AdapterConfig[] = [
  { name: 'cursor', ruleFile: '.cursorrules', assetsDir: '.flowmem' },
  { name: 'windsurf', ruleFile: '.windsurfrules', assetsDir: '.flowmem' },
  { name: 'cline', ruleFile: '.clinerules', assetsDir: '.flowmem' },
  { name: 'trae', ruleFile: '.trae/rules/context-memory.md', assetsDir: '.flowmem', specialStructure: true },
  { name: 'copilot', ruleFile: '.github/copilot-instructions.md', assetsDir: '.flowmem', specialStructure: true },
  { name: 'gemini', ruleFile: 'gemini-rules.md', assetsDir: '.flowmem' },
  { name: 'claude-code', ruleFile: '', assetsDir: '.claude', specialStructure: true, useCommands: true }
];

// Claude Code 命令列表
const CLAUDE_COMMANDS = [
  'workflow',
  'plan',
  'execute',
  'status',
  'resume',
  'audit'
];

/**
 * 复制目录
 */
function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;

  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 替换模板占位符（保留兼容性，但现在推荐使用 flowmem CLI）
 */
function replaceTemplateVars(content: string, _assetsDir: string): string {
  // 现在 common-rules.md 不再使用占位符，直接返回内容
  // 保留此函数以便将来扩展
  return content;
}

/**
 * 构建 Claude Code 适配器包（commands 模式）
 */
function buildClaudeCodePack(
  adapter: AdapterConfig,
  rootDir: string,
  commandsTemplateDir: string,
  examplesDir: string
): void {
  const packDir = path.join(rootDir, 'adapters', adapter.name);

  // 清理旧目录
  if (fs.existsSync(packDir)) {
    fs.rmSync(packDir, { recursive: true });
  }

  ensureDir(packDir);

  console.log(`📦 构建 ${adapter.name} 包（commands 模式）...`);

  // 创建 .claude/commands/flowmem/ 目录
  const commandsDir = path.join(packDir, '.claude', 'commands', 'flowmem');
  ensureDir(commandsDir);

  // 复制命令模板
  for (const cmd of CLAUDE_COMMANDS) {
    const srcFile = path.join(commandsTemplateDir, `${cmd}.md`);
    const destFile = path.join(commandsDir, `${cmd}.md`);

    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`  ✓ 复制命令: /flowmem:${cmd}`);
    } else {
      console.log(`  ⚠ 命令模板不存在: ${cmd}.md`);
    }
  }

  // 复制 hooks 配置示例
  const hooksExample = path.join(examplesDir, 'claude-hooks-settings.json');
  if (fs.existsSync(hooksExample)) {
    const claudeDir = path.join(packDir, '.claude');
    fs.copyFileSync(hooksExample, path.join(claudeDir, 'settings.example.json'));
    console.log('  ✓ 复制 hooks 配置示例');
  }

  console.log(`  ✓ 生成 ${CLAUDE_COMMANDS.length} 个命令`);
}

/**
 * 构建标准适配器包
 */
function buildStandardPack(
  adapter: AdapterConfig,
  rootDir: string,
  templateContent: string,
  templatesDir: string,
  examplesDir: string
): void {
  const packDir = path.join(rootDir, 'adapters', adapter.name);

  // 清理旧目录
  if (fs.existsSync(packDir)) {
    fs.rmSync(packDir, { recursive: true });
  }

  ensureDir(packDir);

  const assetsPath = path.join(packDir, adapter.assetsDir);
  ensureDir(assetsPath);

  console.log(`📦 构建 ${adapter.name} 包...`);

  // 复制模板目录
  if (fs.existsSync(templatesDir)) {
    copyDir(templatesDir, path.join(assetsPath, 'templates'));
    console.log('  ✓ 复制模板目录');
  }

  // 复制示例目录
  if (fs.existsSync(examplesDir)) {
    copyDir(examplesDir, path.join(assetsPath, 'examples'));
    console.log('  ✓ 复制示例目录');
  }

  // 生成规则文件
  const ruleContent = replaceTemplateVars(templateContent, adapter.assetsDir);
  const ruleFilePath = path.join(packDir, adapter.ruleFile);

  // 确保规则文件目录存在
  ensureDir(path.dirname(ruleFilePath));

  writeFile(ruleFilePath, ruleContent);
  console.log(`  ✓ 生成规则: ${adapter.ruleFile}`);
}

export const buildAdaptersCommand = new Command('build-adapters')
  .description('构建各 IDE 的适配器包')
  .option('--output <dir>', '输出目录', '.')
  .option('--only <adapter>', '只构建指定适配器')
  .action((options) => {
    // 确定包根目录
    const rootDir = path.resolve(options.output);
    const adaptersDir = path.join(rootDir, 'adapters');
    const templateFile = path.join(adaptersDir, 'common-rules.md');
    const templatesDir = path.join(rootDir, 'templates');
    const commandsTemplateDir = path.join(templatesDir, 'commands');
    const examplesDir = path.join(rootDir, 'examples');

    console.log('🚀 构建 FlowMem v2.8 适配器包...\n');
    console.log(`输出目录: ${adaptersDir}\n`);

    // 构建适配器
    const adaptersToBuild = options.only
      ? ADAPTERS.filter(a => a.name === options.only)
      : ADAPTERS;

    if (adaptersToBuild.length === 0) {
      console.error(`❌ 未找到适配器: ${options.only}`);
      process.exit(1);
    }

    for (const adapter of adaptersToBuild) {
      if (adapter.useCommands) {
        // Claude Code 使用 commands 模式
        buildClaudeCodePack(adapter, rootDir, commandsTemplateDir, examplesDir);
      } else {
        // 其他适配器使用规则文件模式
        const templateContent = readFile(templateFile);
        if (!templateContent) {
          console.error(`❌ 找不到模板文件: ${templateFile}`);
          process.exit(1);
        }
        buildStandardPack(adapter, rootDir, templateContent, templatesDir, examplesDir);
      }
    }

    console.log('\n🎉 适配器构建完成！\n');
    console.log('已生成的适配器包:');
    for (const adapter of adaptersToBuild) {
      if (adapter.useCommands) {
        console.log(`  - ${adapter.name}/ (commands 模式: /flowmem:*)`);
      } else {
        console.log(`  - ${adapter.name}/ (${adapter.ruleFile})`);
      }
    }

    console.log('\n提示: 现在推荐使用 npm 安装 @ccq/workflow 并运行 flowmem init');
  });
