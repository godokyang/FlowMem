/**
 * flowmem init 命令
 * 初始化 .agentmem 目录结构
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getAgentmemPath, agentmemExists, ensureDir, writeFile, getTimestamp, AGENTMEM_DIR } from '../utils/file.js';

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

export const initCommand = new Command('init')
  .description('初始化 .agentmem 目录结构')
  .option('-f, --force', '强制重新初始化（覆盖现有文件）')
  .option('--skip-templates', '跳过模板文件创建')
  .action(async (options) => {
    const cwd = process.cwd();
    const agentmemPath = getAgentmemPath(cwd);

    // 检查是否已存在
    if (agentmemExists(cwd) && !options.force) {
      console.log('⚠️  .agentmem 目录已存在。使用 --force 强制重新初始化。');
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

    console.log('\n🎉 初始化完成！');
    console.log('\n下一步:');
    console.log('  1. 编辑 .agentmem/project.md 配置项目信息');
    console.log('  2. 开始使用 AI 助手进行开发');
    console.log('\n常用命令:');
    console.log('  flowmem todo list    - 查看任务列表');
    console.log('  flowmem todo stats   - 查看进度统计');
    console.log('  flowmem audit        - 运行审核检查');
  });
