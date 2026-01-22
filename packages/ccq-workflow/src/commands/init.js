const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { detectAdapter } = require('../utils/detect-adapter');
const { copyDirectory, copyFile, ensureDir } = require('../utils/file-ops');

async function initCommand(options) {
  const {
    adapter: manualAdapter,
    force = false,
    global: isGlobal = false,
    skipAgentmem = false,
    withMcp = false
  } = options;

  const cwd = process.cwd();
  const projectRoot = isGlobal ? path.join(process.env.HOME || process.env.USERPROFILE, '.flowmem') : cwd;
  
  console.log(chalk.cyan('🚀 FlowMem 初始化'));
  console.log(chalk.gray(`目标目录: ${projectRoot}`));
  
  let adapterName = manualAdapter;
  
  if (!adapterName) {
    console.log(chalk.cyan('\n🔍 检测编辑器...'));
    adapterName = detectAdapter(projectRoot);
    console.log(chalk.green(`✓ 检测到: ${adapterName}`));
  } else {
    console.log(chalk.cyan(`\n📦 使用指定适配器: ${adapterName}`));
  }
  
  const packageRoot = path.join(__dirname, '../..');
  const adapterSource = path.join(packageRoot, 'adapters', adapterName);
  
  if (!fs.existsSync(adapterSource)) {
    throw new Error(`适配器不存在: ${adapterName}`);
  }
  
  console.log(chalk.cyan('\n📦 正在安装 FlowMem...'));
  
  const filesToCopy = getAdapterFiles(adapterName);
  let copied = 0;
  
  for (const { src, dest } of filesToCopy) {
    const srcPath = path.join(adapterSource, src);
    const destPath = path.join(projectRoot, dest);
    
    if (fs.existsSync(destPath) && !force) {
      console.log(chalk.yellow(`⚠️  跳过: ${dest} (已存在)`));
      continue;
    }
    
    const destDir = path.dirname(destPath);
    await ensureDir(destDir);
    
    if (fs.statSync(srcPath).isDirectory()) {
      await copyDirectory(srcPath, destPath, { force });
    } else {
      await copyFile(srcPath, destPath, { force });
    }
    
    copied++;
    console.log(chalk.green(`✓ ${dest}`));
  }
  
  if (!skipAgentmem) {
    console.log(chalk.cyan('\n📁 初始化 .agentmem/...'));
    const agentmemDir = path.join(projectRoot, '.agentmem');
    
    if (!fs.existsSync(agentmemDir) || force) {
      await ensureDir(agentmemDir);
      
      const templateDir = path.join(projectRoot, '.flowmem', 'templates');
      const projectTemplate = path.join(templateDir, 'project.md');
      
      if (fs.existsSync(projectTemplate)) {
        await copyFile(
          projectTemplate,
          path.join(agentmemDir, 'project.md'),
          { force }
        );
        console.log(chalk.green('✓ 创建 project.md'));
      }
    } else {
      console.log(chalk.yellow('⚠️  .agentmem/ 已存在'));
    }
  }
  
  if (withMcp) {
    console.log(chalk.cyan('\n🔌 配置 MCP 审核...'));
    const mcpConfig = {
      mcpServers: {
        "ccq-engine": {
          "command": "npx",
          "args": ["-y", "@ccq/engine", "mcp"]
        }
      }
    };

    if (adapterName === 'claude-code' || adapterName === 'cursor' || adapterName === 'windsurf') {
      const settingsPath = path.join(projectRoot, '.vscode', 'mcp.json'); // Example path, adjust per adapter
      // Real path depends on OS and editor. For project-local, .vscode/mcp.json isn't standard yet but common convention.
      // For Claude Desktop it's global config.
      // For now, let's just write to a local config file user can use.
      const localMcpPath = path.join(projectRoot, 'mcp-server-config.json');
      await fs.writeJson(localMcpPath, mcpConfig, { spaces: 2 });
      console.log(chalk.green(`✓ 生成 MCP 配置: ${localMcpPath}`));
      console.log(chalk.yellow('  请手动将此配置添加到您的编辑器 MCP 设置中。'));
    } else {
      console.log(chalk.yellow('⚠️  当前适配器暂不支持自动 MCP 配置'));
    }
  }
  
  console.log(chalk.green('\n🎉 安装完成！'));
  console.log(chalk.gray('\n下一步:'));
  console.log(chalk.gray('  1. 开始新任务时，AI 会自动创建 .agentmem/ 目录'));
  console.log(chalk.gray('  2. 使用 `flowmem audit` 检查工作流程规则'));
}

function getAdapterFiles(adapterName) {
  if (adapterName === 'claude-code') {
    return [
      { src: '.claude', dest: '.claude' }
    ];
  }
  
  const commonFiles = [
    { src: '.flowmem', dest: '.flowmem' }
  ];
  
  const adapterSpecific = {
    'cursor': [
      { src: '.cursorrules', dest: '.cursorrules' }
    ],
    'windsurf': [
      { src: '.windsurfrules', dest: '.windsurfrules' }
    ],
    'cline': [
      { src: '.clinerules', dest: '.clinerules' }
    ],
    'trae': [
      { src: '.trae', dest: '.trae' }
    ],
    'copilot': [
      { src: '.github', dest: '.github' }
    ],
    'gemini': [
      { src: 'gemini-rules.md', dest: 'gemini-rules.md' }
    ]
  };
  
  return [...commonFiles, ...(adapterSpecific[adapterName] || [])];
}

module.exports = initCommand;
