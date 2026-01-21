const path = require('path');
const chalk = require('chalk');
const { runCheck, runAllChecks } = require('../utils/checks');

async function auditCommand(check, options) {
  const { json = false } = options;
  const cwd = process.cwd();
  
  if (!json) {
    console.log(chalk.cyan('🔍 FlowMem 审核报告'));
    console.log(chalk.gray('━'.repeat(33)));
  }
  
  try {
    let results;
    
    if (check) {
      const result = await runCheck(check, cwd);
      results = { [check]: result };
    } else {
      results = await runAllChecks(cwd);
    }
    
    if (json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    
    let passCount = 0;
    let failCount = 0;
    
    for (const [name, result] of Object.entries(results)) {
      const icon = result.pass ? chalk.green('✅') : chalk.red('❌');
      const message = result.pass ? chalk.green(result.message) : chalk.red(result.message);
      
      console.log(`${icon} ${formatCheckName(name)}: ${message}`);
      
      if (result.details) {
        const details = formatDetails(result.details);
        if (details) {
          console.log(chalk.gray(`   └─ ${details}`));
        }
      }
      
      if (result.pass) {
        passCount++;
      } else {
        failCount++;
      }
    }
    
    console.log(chalk.gray('━'.repeat(33)));
    console.log(chalk.cyan(`总计: ${passCount} 通过, ${failCount} 失败`));
    
    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    if (!json) {
      console.error(chalk.red('审核失败:'), error.message);
    } else {
      console.error(JSON.stringify({ error: error.message }));
    }
    process.exit(1);
  }
}

function formatCheckName(name) {
  const names = {
    'debt': '债务检查',
    'sync': 'request 同步',
    'project': 'project 更新',
    'size': 'project 大小',
    'request-size': 'request 大小',
    'todo': 'todolist 状态',
    'active': '活动任务检测',
    'confirmed': 'request 确认',
    'archive': '归档完整性',
    'structure': '结构完整性'
  };
  return names[name] || name;
}

function formatDetails(details) {
  if (typeof details === 'object') {
    const parts = [];
    for (const [key, value] of Object.entries(details)) {
      parts.push(`${key}: ${value}`);
    }
    return parts.join(', ');
  }
  return String(details);
}

module.exports = auditCommand;
