const chalk = require('chalk');
const path = require('path');
const inquirer = require('inquirer');
const {
  parseTodoList,
  calculateStats,
  calculateTotalTime,
  generateProgressBar,
  updateTodoList,
  validateTimeFormat
} = require('../utils/todo-parser');

async function todoCommand(subcommand, options, program) {
  const projectRoot = process.cwd();
  const todoFile = path.join(projectRoot, '.agentmem', 'todolist.md');
  
  switch (subcommand) {
    case 'list':
      return await listTodos(todoFile, options);
    case 'stats':
      return await showStats(todoFile, options);
    case 'add':
      return await addTodo(todoFile, options);
    case 'update':
      return await updateTodo(todoFile, options);
    case 'get':
      return await getTodo(todoFile, options);
    case 'set':
      return await setTodo(todoFile, options);
    default:
      program.help();
  }
}

async function listTodos(todoFile, options) {
  try {
    const { meta, todos, format } = parseTodoList(todoFile);
    
    console.log(chalk.bold.blue(`\n📋 ${meta.title || '任务列表'}\n`));
    
    if (todos.length === 0) {
      console.log(chalk.gray('  暂无任务\n'));
      return;
    }
    
    const phases = {};
    todos.forEach(todo => {
      const phase = todo.phase || '未分类';
      if (!phases[phase]) phases[phase] = [];
      phases[phase].push(todo);
    });
    
    Object.keys(phases).forEach(phase => {
      console.log(chalk.bold.yellow(`\n${phase}`));
      console.log(chalk.gray('─'.repeat(50)));
      
      phases[phase].forEach(todo => {
        const statusIcon = {
          'pending': '⭕',
          'in_progress': '🔄',
          'completed': '✅',
          'cancelled': '❌'
        }[todo.status] || '⭕';
        
        const priorityColor = {
          'high': chalk.red,
          'medium': chalk.yellow,
          'low': chalk.green
        }[todo.priority] || chalk.white;
        
        console.log(`  ${statusIcon} ${chalk.bold(todo.id)}: ${todo.content}`);
        console.log(priorityColor(`     优先级: ${todo.priority.toUpperCase()}`));
        
        if (todo.estimate) {
          console.log(chalk.gray(`     预计: ${todo.estimate}`));
        }
        
        if (todo.dependencies && todo.dependencies.length > 0) {
          console.log(chalk.gray(`     依赖: ${todo.dependencies.join(', ')}`));
        }
        
        console.log();
      });
    });
    
  } catch (err) {
    console.error(chalk.red(`\n❌ 错误: ${err.message}\n`));
    process.exit(1);
  }
}

async function showStats(todoFile, options) {
  try {
    const { meta, todos } = parseTodoList(todoFile);
    const stats = calculateStats(todos);
    const totalTime = calculateTotalTime(todos);
    const progressBar = generateProgressBar(stats, 30);
    
    console.log(chalk.bold.blue(`\n📊 ${meta.title || '任务统计'}\n`));
    console.log(chalk.gray('─'.repeat(50)));
    
    console.log(`\n  总任务: ${chalk.bold(stats.total)}`);
    console.log(`  已完成: ${chalk.green(stats.completed)} (${Math.round(stats.completed / stats.total * 100) || 0}%)`);
    console.log(`  进行中: ${chalk.yellow(stats.inProgress)} (${Math.round(stats.inProgress / stats.total * 100) || 0}%)`);
    console.log(`  待开始: ${chalk.blue(stats.pending)} (${Math.round(stats.pending / stats.total * 100) || 0}%)`);
    console.log(`  已取消: ${chalk.red(stats.cancelled)} (${Math.round(stats.cancelled / stats.total * 100) || 0}%)`);
    
    console.log(`\n  ${progressBar}`);
    console.log(`\n  预计总时间: ${chalk.bold(totalTime)}\n`);
    
    const currentTask = todos.find(t => t.status === 'in_progress');
    if (currentTask) {
      console.log(chalk.bold.yellow('  当前任务:'));
      console.log(`  🔄 ${chalk.bold(currentTask.id)}: ${currentTask.content}\n`);
    }
    
  } catch (err) {
    console.error(chalk.red(`\n❌ 错误: ${err.message}\n`));
    process.exit(1);
  }
}

async function getTodo(todoFile, options) {
  if (!options.id) {
    console.error(chalk.red('❌ 必须指定 --id 参数'));
    process.exit(1);
  }

  const { todos } = parseTodoList(todoFile);
  const task = todos.find(t => t.id === options.id);
  
  if (!task) {
    console.error(chalk.red(`❌ 任务不存在: ${options.id}`));
    process.exit(1);
  }
  
  console.log(JSON.stringify(task, null, 2));
}

async function setTodo(todoFile, options) {
  if (!options.id) {
    console.error(chalk.red('❌ 必须指定 --id 参数'));
    process.exit(1);
  }

  const { meta, todos } = parseTodoList(todoFile);
  const task = todos.find(t => t.id === options.id);
  
  if (!task) {
    console.error(chalk.red(`❌ 任务不存在: ${options.id}`));
    process.exit(1);
  }
  
  let updated = false;
  
  if (options.status) {
    task.status = options.status;
    updated = true;
  }
  
  if (options.priority) {
    task.priority = options.priority;
    updated = true;
  }
  
  if (options.estimate) {
    if (validateTimeFormat(options.estimate)) {
      task.estimate = options.estimate;
      updated = true;
    } else {
      console.error(chalk.red(`❌ 时间格式错误: ${options.estimate} (请使用 5m, 1h, 2d)`));
      process.exit(1);
    }
  }
  
  if (updated) {
    meta.updated = new Date().toISOString();
    updateTodoList(todoFile, { meta, todos });
    console.log(chalk.green(`✅ 任务 ${options.id} 已更新`));
  } else {
    console.log(chalk.yellow('⚠️ 未提供任何更新参数 (--status, --priority, --estimate)'));
  }
}

async function addTodo(todoFile, options) {
  // 如果提供了 --content，则使用非交互模式
  if (options.content) {
    const { meta, todos } = parseTodoList(todoFile);
    const nextId = `TODO-${String(todos.length + 1).padStart(3, '0')}`;
    
    const newTodo = {
      id: nextId,
      content: options.content,
      status: 'pending',
      priority: options.priority || 'medium',
      estimate: options.estimate || '',
      dependencies: [],
      phase: '未分类',
      log: ''
    };
    
    // 验证时间格式
    if (newTodo.estimate && !validateTimeFormat(newTodo.estimate)) {
      console.error(chalk.red(`❌ 时间格式错误: ${newTodo.estimate}`));
      process.exit(1);
    }
    
    todos.push(newTodo);
    meta.updated = new Date().toISOString();
    updateTodoList(todoFile, { meta, todos });
    
    console.log(chalk.green(`✅ 任务已添加: ${nextId}`));
    return;
  }

  // 原有的交互式逻辑
  try {
    const { meta, todos } = parseTodoList(todoFile);
    
    console.log(chalk.bold.blue('\n➕ 添加新任务\n'));
    
    const nextId = `TODO-${String(todos.length + 1).padStart(3, '0')}`;
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'content',
        message: '任务描述:',
        validate: input => input.trim() ? true : '任务描述不能为空'
      },
      {
        type: 'list',
        name: 'priority',
        message: '优先级:',
        choices: [
          { name: '🔴 High', value: 'high' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🟢 Low', value: 'low' }
        ],
        default: 'medium'
      },
      {
        type: 'input',
        name: 'estimate',
        message: '预估时间 (5m/1h/2d):',
        validate: input => {
          if (!input.trim()) return true;
          return validateTimeFormat(input) ? true : '格式错误，请使用 5m/1h/2d 格式';
        }
      },
      {
        type: 'input',
        name: 'dependencies',
        message: '依赖任务 (逗号分隔，如 TODO-001,TODO-002):',
        filter: input => {
          if (!input.trim()) return [];
          return input.split(',').map(id => id.trim()).filter(id => id);
        }
      },
      {
        type: 'input',
        name: 'phase',
        message: '阶段名称:',
        default: '未分类'
      }
    ]);
    
    const newTodo = {
      id: nextId,
      content: answers.content,
      status: 'pending',
      priority: answers.priority,
      estimate: answers.estimate || '',
      dependencies: answers.dependencies,
      phase: answers.phase,
      log: ''
    };
    
    todos.push(newTodo);
    meta.updated = new Date().toISOString();
    
    updateTodoList(todoFile, { meta, todos });
    
    console.log(chalk.green(`\n✅ 任务已添加: ${nextId}\n`));
    
  } catch (err) {
    console.error(chalk.red(`\n❌ 错误: ${err.message}\n`));
    process.exit(1);
  }
}

async function updateTodo(todoFile, options) {
  try {
    const { meta, todos } = parseTodoList(todoFile);
    
    console.log(chalk.bold.blue('\n🔄 更新任务\n'));
    
    const todoChoices = todos.map(t => ({
      name: `${t.id}: ${t.content} (${t.status})`,
      value: t.id
    }));
    
    const { todoId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'todoId',
        message: '选择要更新的任务:',
        choices: todoChoices,
        pageSize: 10
      }
    ]);
    
    const todo = todos.find(t => t.id === todoId);
    
    const { updateType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'updateType',
        message: '更新类型:',
        choices: [
          { name: '📝 状态', value: 'status' },
          { name: '⚡ 优先级', value: 'priority' },
          { name: '⏱️  预估时间', value: 'estimate' },
          { name: '🔗 依赖关系', value: 'dependencies' }
        ]
      }
    ]);
    
    switch (updateType) {
      case 'status':
        const { newStatus } = await inquirer.prompt([
          {
            type: 'list',
            name: 'newStatus',
            message: '新状态:',
            choices: [
              { name: '⭕ Pending (待开始)', value: 'pending' },
              { name: '🔄 In Progress (进行中)', value: 'in_progress' },
              { name: '✅ Completed (已完成)', value: 'completed' },
              { name: '❌ Cancelled (已取消)', value: 'cancelled' }
            ],
            default: todo.status
          }
        ]);
        todo.status = newStatus;
        break;
        
      case 'priority':
        const { newPriority } = await inquirer.prompt([
          {
            type: 'list',
            name: 'newPriority',
            message: '新优先级:',
            choices: [
              { name: '🔴 High', value: 'high' },
              { name: '🟡 Medium', value: 'medium' },
              { name: '🟢 Low', value: 'low' }
            ],
            default: todo.priority
          }
        ]);
        todo.priority = newPriority;
        break;
        
      case 'estimate':
        const { newEstimate } = await inquirer.prompt([
          {
            type: 'input',
            name: 'newEstimate',
            message: '新预估时间 (5m/1h/2d):',
            default: todo.estimate,
            validate: input => {
              if (!input.trim()) return true;
              return validateTimeFormat(input) ? true : '格式错误，请使用 5m/1h/2d 格式';
            }
          }
        ]);
        todo.estimate = newEstimate;
        break;
        
      case 'dependencies':
        const { newDeps } = await inquirer.prompt([
          {
            type: 'input',
            name: 'newDeps',
            message: '新依赖 (逗号分隔):',
            default: (todo.dependencies || []).join(', '),
            filter: input => {
              if (!input.trim()) return [];
              return input.split(',').map(id => id.trim()).filter(id => id);
            }
          }
        ]);
        todo.dependencies = newDeps;
        break;
    }
    
    meta.updated = new Date().toISOString();
    updateTodoList(todoFile, { meta, todos });
    
    console.log(chalk.green(`\n✅ 任务 ${todoId} 已更新\n`));
    
  } catch (err) {
    console.error(chalk.red(`\n❌ 错误: ${err.message}\n`));
    process.exit(1);
  }
}

module.exports = todoCommand;
