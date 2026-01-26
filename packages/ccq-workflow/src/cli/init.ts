/**
 * flowmem init 命令
 * 初始化 .agentmem 目录结构
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getAgentmemPath, agentmemExists, ensureDir, writeFile, getTimestamp, AGENTMEM_DIR } from '../utils/file.js';

/**
 * 获取包的根目录
 * 编译后文件位于 dist/cli/init.js，向上两级到包根目录
 */
function getPackageRoot(): string {
  return path.resolve(__dirname, '../../');
}

// 适配器配置
const ADAPTERS: Record<string, { description: string; files: string[] }> = {
  'claude-code': {
    description: 'Claude Code CLI',
    files: ['.claude']
  },
  'cursor': {
    description: 'Cursor IDE',
    files: ['.cursorrules', '.flowmem']
  },
  'windsurf': {
    description: 'Windsurf IDE',
    files: ['.windsurfrules', '.flowmem']
  },
  'cline': {
    description: 'Cline (VS Code 插件)',
    files: ['.clinerules', '.flowmem']
  },
  'copilot': {
    description: 'GitHub Copilot',
    files: ['.github', '.flowmem']
  },
  'trae': {
    description: 'Trae IDE',
    files: ['.trae', '.flowmem']
  },
  'gemini': {
    description: 'Google Gemini',
    files: ['gemini-rules.md', '.flowmem']
  }
};

// 适配器列表（保持顺序）
const ADAPTER_LIST = Object.keys(ADAPTERS);

/**
 * 交互式选择适配器（上下箭头选择）
 */
async function selectAdapter(): Promise<string | null> {
  // 动态导入 @inquirer/select
  const { default: select } = await import('@inquirer/select');

  const choices = [
    ...ADAPTER_LIST.map(name => ({
      name: `${name.padEnd(12)} - ${ADAPTERS[name].description}`,
      value: name
    })),
    {
      name: '跳过（稍后安装）',
      value: null as string | null
    }
  ];

  try {
    const answer = await select({
      message: '请选择要安装的 IDE 适配器（↑↓ 选择，Enter 确认）:',
      choices,
      loop: true
    });

    if (answer === null) {
      console.log('⏭️  跳过适配器安装');
    }

    return answer;
  } catch {
    // 用户按 Ctrl+C 取消
    console.log('\n⏭️  跳过适配器安装');
    return null;
  }
}

// 目录结构
const DIRECTORIES = [
  'logs',
  'implementation',
  'notepad',
  'history',
  '.lock'
];

// 模板文件
const TEMPLATES: Record<string, string> = {
  'project.md': `---
created_at: "{timestamp}"
updated_at: "{timestamp}"
version: "1.0"
---

# 项目配置

## 基本信息

- **项目名称**: [你的项目名称]
- **技术栈**:
  - 语言: TypeScript
  - 框架: [框架名称]

## Workflow 配置

\`\`\`yaml
workflow:
  risk:
    high_paths:
      - "auth/"
      - "security/"
      - "migrations/"
    protected_files:
      - "package.json"
      - "package-lock.json"
      - ".env"
  tests:
    primary:
      - "npm test"
      - "npm run build"
    secondary:
      - "npm run lint"
  lazy_patterns:
    - "TODO"
    - "FIXME"
    - "Not implemented"
\`\`\`

## 团队约定

- [约定1]
- [约定2]
`,

  'session.json': `{
  "session_id": "{session_id}",
  "created_at": "{timestamp}",
  "updated_at": "{timestamp}",
  "current_phase": 0,
  "current_todo_id": null,
  "retry_count": 0,
  "status": "active",
  "checkpoints": []
}`,

  'todolist.md': `---
created_at: "{timestamp}"
updated_at: "{timestamp}"
request_id: ""
total_todos: 0
completed_todos: 0
current_phase: 0
---

# 任务清单

> 当前无活动任务

## Phase 1: 需求澄清

_等待需求..._

## Phase 2: 详细规划

_等待规划..._

## Phase 3: 执行与审核

_等待执行..._

## Phase 4: 交付

_等待交付..._
`,

  'notepad/learnings.md': `---
created_at: "{timestamp}"
type: "learnings"
---

# 经验记录

> 记录项目开发过程中的经验教训

## 技术经验

_暂无记录_

## 流程经验

_暂无记录_
`,

  'notepad/issues.md': `---
created_at: "{timestamp}"
type: "issues"
---

# 问题追踪

> 记录遇到的问题及解决方案

## 待解决

_暂无问题_

## 已解决

_暂无记录_
`
};

/**
 * 递归复制目录或文件
 */
function copyRecursive(src: string, dest: string, force: boolean): boolean {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    // 如果目标目录已存在且不是强制模式，跳过
    if (fs.existsSync(dest) && !force) {
      return false;
    }
    ensureDir(dest);
    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file), force);
    }
    return true;
  } else {
    // 如果目标文件已存在且不是强制模式，跳过
    if (fs.existsSync(dest) && !force) {
      return false;
    }
    fs.copyFileSync(src, dest);
    return true;
  }
}

/**
 * 安装适配器
 */
function installAdapter(adapterName: string, cwd: string, force: boolean): boolean {
  const adapter = ADAPTERS[adapterName];
  if (!adapter) {
    console.log(`❌ 未知适配器: ${adapterName}`);
    console.log(`   可用适配器: ${Object.keys(ADAPTERS).join(', ')}`);
    return false;
  }

  const adapterPath = path.join(getPackageRoot(), 'adapters', adapterName);
  if (!fs.existsSync(adapterPath)) {
    console.log(`❌ 适配器目录不存在: ${adapterPath}`);
    return false;
  }

  console.log(`\n📦 安装适配器: ${adapterName} (${adapter.description})`);

  for (const file of adapter.files) {
    const srcPath = path.join(adapterPath, file);
    const destPath = path.join(cwd, file);

    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  跳过不存在的文件: ${file}`);
      continue;
    }

    if (fs.existsSync(destPath) && !force) {
      console.log(`⏭️  跳过已存在: ${file}`);
      continue;
    }

    copyRecursive(srcPath, destPath, force);
    console.log(`✅ 复制: ${file}`);
  }

  return true;
}

/**
 * 列出可用适配器
 */
function listAdapters(): void {
  console.log('\n可用适配器:\n');
  for (const [name, config] of Object.entries(ADAPTERS)) {
    console.log(`  ${name.padEnd(12)} - ${config.description}`);
  }
  console.log('\n使用示例:');
  console.log('  flowmem init --adapter claude-code');
  console.log('  flowmem init -a cursor');
}

export const initCommand = new Command('init')
  .description('初始化 .agentmem 目录结构')
  .option('-f, --force', '强制重新初始化（覆盖现有文件）')
  .option('-a, --adapter <name>', '指定要安装的 IDE 适配器')
  .option('--list-adapters', '列出所有可用的适配器')
  .option('--skip-templates', '跳过模板文件创建')
  .option('--skip-adapter', '跳过适配器安装（不弹出选择）')
  .option('--adapter-only', '仅安装适配器，跳过 .agentmem 初始化')
  .action(async (options) => {
    const cwd = process.cwd();
    const agentmemPath = getAgentmemPath(cwd);

    // 列出适配器
    if (options.listAdapters) {
      listAdapters();
      return;
    }

    // 仅安装适配器模式
    if (options.adapterOnly) {
      if (!options.adapter) {
        console.log('❌ 使用 --adapter-only 时必须指定 --adapter');
        return;
      }
      installAdapter(options.adapter, cwd, options.force);
      console.log('\n🎉 适配器安装完成！');
      return;
    }

    // 检查是否已存在
    if (agentmemExists(cwd) && !options.force) {
      console.log('⚠️  .agentmem 目录已存在。使用 --force 强制重新初始化。');

      // 即使 .agentmem 已存在，也允许安装适配器
      if (options.adapter) {
        installAdapter(options.adapter, cwd, options.force);
        console.log('\n🎉 适配器安装完成！');
      }
      return;
    }

    console.log('🚀 初始化 FlowMem Workflow...\n');

    // 创建主目录
    ensureDir(agentmemPath);
    console.log(`✅ 创建目录: ${AGENTMEM_DIR}/`);

    // 创建子目录
    for (const dir of DIRECTORIES) {
      const dirPath = path.join(agentmemPath, dir);
      ensureDir(dirPath);
      console.log(`✅ 创建目录: ${AGENTMEM_DIR}/${dir}/`);
    }

    // 创建模板文件
    if (!options.skipTemplates) {
      const timestamp = getTimestamp();
      const sessionId = `SESSION-${Date.now().toString(36).toUpperCase()}`;

      for (const [filename, template] of Object.entries(TEMPLATES)) {
        const filePath = path.join(agentmemPath, filename);

        // 如果文件已存在且不是强制模式，跳过
        if (fs.existsSync(filePath) && !options.force) {
          console.log(`⏭️  跳过已存在: ${AGENTMEM_DIR}/${filename}`);
          continue;
        }

        // 替换模板变量
        const content = template
          .replace(/\{timestamp\}/g, timestamp)
          .replace(/\{session_id\}/g, sessionId);

        writeFile(filePath, content);
        console.log(`✅ 创建文件: ${AGENTMEM_DIR}/${filename}`);
      }
    }

    // 创建 .gitignore
    const gitignorePath = path.join(agentmemPath, '.gitignore');
    if (!fs.existsSync(gitignorePath) || options.force) {
      const gitignoreContent = `# FlowMem Workflow 临时文件
.lock/
*.tmp
session.json

# 保留历史记录
!history/
`;
      writeFile(gitignorePath, gitignoreContent);
      console.log(`✅ 创建文件: ${AGENTMEM_DIR}/.gitignore`);
    }

    // 安装适配器（指定或交互选择）
    let adapterToInstall = options.adapter;
    if (!adapterToInstall && !options.skipAdapter) {
      // 交互式选择适配器
      adapterToInstall = await selectAdapter();
    }

    if (adapterToInstall) {
      installAdapter(adapterToInstall, cwd, options.force);
    }

    console.log('\n🎉 初始化完成！');
    console.log('\n下一步:');
    console.log('  1. 编辑 .agentmem/project.md 配置项目信息');
    if (!adapterToInstall) {
      console.log('  2. 安装 IDE 适配器: flowmem init --adapter <name>');
      console.log('     查看可用适配器: flowmem init --list-adapters');
    }
    console.log('  3. 开始使用 AI 助手进行开发');
    console.log('\n常用命令:');
    console.log('  flowmem todo list    - 查看任务列表');
    console.log('  flowmem todo stats   - 查看进度统计');
    console.log('  flowmem audit        - 运行审核检查');
  });
