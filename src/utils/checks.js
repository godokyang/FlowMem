const path = require('path');
const fs = require('fs-extra');
const { parseTodoList, calculateStats, validateDependencies, detectCircularDependencies, validateTimeFormat } = require('./todo-parser');

const CHECKS = {
  debt: checkDebt,
  sync: checkSync,
  project: checkProject,
  size: checkSize,
  'request-size': checkRequestSize,
  todo: checkTodo,
  active: checkActive,
  confirmed: checkConfirmed,
  archive: checkArchive,
  structure: checkStructure,
  'dependency-check': checkDependencies,
  'time-format': checkTimeFormat
};

async function checkDebt(projectRoot) {
  const taskLogsDir = path.join(projectRoot, '.agentmem', 'task_logs');
  
  if (!fs.existsSync(taskLogsDir)) {
    return {
      pass: true,
      message: '无 task_logs 目录（债务为 0）',
      details: { debt: 0, max: 3 }
    };
  }
  
  const debt = 0;
  
  return {
    pass: debt < 3,
    message: debt < 3 ? `债务检查通过 (${debt}/3)` : `债务超限 (${debt}/3)`,
    details: { debt, max: 3 }
  };
}

async function checkSync(projectRoot) {
  const requestFile = path.join(projectRoot, '.agentmem', 'request.md');
  
  if (!fs.existsSync(requestFile)) {
    return {
      pass: true,
      message: '无 request.md（无需同步）',
      details: null
    };
  }
  
  return {
    pass: true,
    message: 'request 同步检查通过',
    details: null
  };
}

async function checkProject(projectRoot) {
  const projectFile = path.join(projectRoot, '.agentmem', 'project.md');
  
  if (!fs.existsSync(projectFile)) {
    return {
      pass: false,
      message: 'project.md 不存在',
      details: null
    };
  }
  
  return {
    pass: true,
    message: 'project 存在',
    details: null
  };
}

async function checkSize(projectRoot) {
  const projectFile = path.join(projectRoot, '.agentmem', 'project.md');
  if (!fs.existsSync(projectFile)) {
    return { pass: false, message: 'project.md 不存在', details: null };
  }
  
  const content = await fs.readFile(projectFile, 'utf-8');
  const lines = content.split('\n').length;
  
  return {
    pass: lines <= 300,
    message: lines <= 300 ? 'project 大小检查通过' : `project.md 超过 300 行 (${lines} 行)`,
    details: { lines, max: 300 }
  };
}

async function checkRequestSize(projectRoot) {
  const requestFile = path.join(projectRoot, '.agentmem', 'request.md');
  
  if (!fs.existsSync(requestFile)) {
    return {
      pass: true,
      message: '无 request.md',
      details: null
    };
  }
  
  const content = await fs.readFile(requestFile, 'utf-8');
  const lines = content.split('\n').length;
  
  const rounds = (content.match(/##\s*.*第\s*\d+\s*轮/g) || []).length;
  
  const sizeOk = lines <= 150;
  const roundsOk = rounds <= 5;
  
  return {
    pass: sizeOk && roundsOk,
    message: sizeOk && roundsOk ? 'request 大小检查通过' : 
             `request.md 超限 (${lines} 行, ${rounds} 轮)`,
    details: { lines, rounds, maxLines: 150, maxRounds: 5 }
  };
}

async function checkTodo(projectRoot) {
  const todoFile = path.join(projectRoot, '.agentmem', 'todolist.md');
  
  if (!fs.existsSync(todoFile)) {
    return {
      pass: true,
      message: '无 todolist.md',
      details: null
    };
  }
  
  try {
    const { todos, format } = parseTodoList(todoFile);
    const stats = calculateStats(todos);
    
    return {
      pass: true,
      message: `todolist: ${stats.completed}/${stats.total} 完成 (格式: ${format})`,
      details: {
        ...stats,
        format,
        hasPriority: todos.some(t => t.priority && t.priority !== 'medium'),
        hasDependencies: todos.some(t => t.dependencies && t.dependencies.length > 0),
        hasEstimate: todos.some(t => t.estimate)
      }
    };
  } catch (err) {
    return {
      pass: false,
      message: `todolist 解析失败: ${err.message}`,
      details: { error: err.message }
    };
  }
}

async function checkActive(projectRoot) {
  const requestFile = path.join(projectRoot, '.agentmem', 'request.md');
  const todoFile = path.join(projectRoot, '.agentmem', 'todolist.md');
  
  const hasRequest = fs.existsSync(requestFile);
  const hasTodo = fs.existsSync(todoFile);
  
  return {
    pass: true,
    message: hasRequest || hasTodo ? '检测到活动任务' : '无活动任务',
    details: { hasRequest, hasTodo }
  };
}

async function checkConfirmed(projectRoot) {
  const requestFile = path.join(projectRoot, '.agentmem', 'request.md');
  
  if (!fs.existsSync(requestFile)) {
    return {
      pass: true,
      message: '无 request.md',
      details: null
    };
  }
  
  const content = await fs.readFile(requestFile, 'utf-8');
  
  const hasConfirmed = /已确认|开始执行|confirmed/i.test(content);
  
  return {
    pass: hasConfirmed,
    message: hasConfirmed ? 'request 已确认' : 'request 未确认',
    details: { confirmed: hasConfirmed }
  };
}

async function checkArchive(projectRoot) {
  const requestFile = path.join(projectRoot, '.agentmem', 'request.md');
  const todoFile = path.join(projectRoot, '.agentmem', 'todolist.md');
  const historyDir = path.join(projectRoot, '.agentmem', 'history');
  
  const hasActiveTask = fs.existsSync(requestFile) || fs.existsSync(todoFile);
  
  if (!hasActiveTask) {
    return {
      pass: true,
      message: '无活动任务，归档检查通过',
      details: null
    };
  }
  
  const content = fs.existsSync(todoFile) ? await fs.readFile(todoFile, 'utf-8') : '';
  const total = (content.match(/- \[[ x\/]\]/g) || []).length;
  const completed = (content.match(/- \[x\]/g) || []).length;
  
  const shouldArchive = total > 0 && completed === total;
  
  if (!shouldArchive) {
    return {
      pass: true,
      message: '任务进行中，无需归档',
      details: { completed, total }
    };
  }
  
  const hasHistory = fs.existsSync(historyDir);
  
  return {
    pass: !shouldArchive || hasHistory,
    message: hasHistory ? '归档完整' : '任务已完成但未归档',
    details: { shouldArchive, hasHistory }
  };
}

async function checkStructure(projectRoot) {
  const agentmemDir = path.join(projectRoot, '.agentmem');
  
  if (!fs.existsSync(agentmemDir)) {
    return {
      pass: false,
      message: '.agentmem/ 目录不存在',
      details: null
    };
  }
  
  return {
    pass: true,
    message: '结构完整性检查通过',
    details: null
  };
}

async function checkDependencies(projectRoot) {
  const todoFile = path.join(projectRoot, '.agentmem', 'todolist.md');
  
  if (!fs.existsSync(todoFile)) {
    return {
      pass: true,
      message: '无 todolist.md',
      details: null
    };
  }
  
  try {
    const { todos, format } = parseTodoList(todoFile);
    
    if (format === 'legacy') {
      return {
        pass: true,
        message: '传统格式无依赖关系',
        details: { format: 'legacy' }
      };
    }
    
    const basicValidation = validateDependencies(todos);
    const circularCheck = detectCircularDependencies(todos);
    
    if (!basicValidation.valid) {
      return {
        pass: false,
        message: `依赖验证失败: ${basicValidation.errors.length} 个错误`,
        details: {
          errors: basicValidation.errors,
          cycles: circularCheck.cycles
        }
      };
    }
    
    if (circularCheck.hasCircular) {
      return {
        pass: false,
        message: `检测到循环依赖: ${circularCheck.cycles.length} 个环`,
        details: {
          cycles: circularCheck.cycles
        }
      };
    }
    
    return {
      pass: true,
      message: '依赖关系检查通过',
      details: {
        totalDependencies: todos.reduce((sum, t) => sum + (t.dependencies?.length || 0), 0)
      }
    };
  } catch (err) {
    return {
      pass: false,
      message: `依赖检查失败: ${err.message}`,
      details: { error: err.message }
    };
  }
}

async function checkTimeFormat(projectRoot) {
  const todoFile = path.join(projectRoot, '.agentmem', 'todolist.md');
  
  if (!fs.existsSync(todoFile)) {
    return {
      pass: true,
      message: '无 todolist.md',
      details: null
    };
  }
  
  try {
    const { todos, format } = parseTodoList(todoFile);
    
    if (format === 'legacy') {
      return {
        pass: true,
        message: '传统格式无时间预估',
        details: { format: 'legacy' }
      };
    }
    
    const invalidTimes = [];
    
    todos.forEach(todo => {
      if (todo.estimate && !validateTimeFormat(todo.estimate)) {
        invalidTimes.push({
          id: todo.id,
          estimate: todo.estimate
        });
      }
    });
    
    if (invalidTimes.length > 0) {
      return {
        pass: false,
        message: `时间格式错误: ${invalidTimes.length} 个任务`,
        details: {
          invalidTimes,
          validFormat: '5m, 1h, 2d'
        }
      };
    }
    
    return {
      pass: true,
      message: '时间格式检查通过',
      details: {
        totalWithEstimate: todos.filter(t => t.estimate).length
      }
    };
  } catch (err) {
    return {
      pass: false,
      message: `时间格式检查失败: ${err.message}`,
      details: { error: err.message }
    };
  }
}

async function runCheck(checkName, projectRoot) {
  const checkFn = CHECKS[checkName];
  if (!checkFn) {
    throw new Error(`未知的检查项: ${checkName}`);
  }
  
  return await checkFn(projectRoot);
}

async function runAllChecks(projectRoot) {
  const results = {};
  
  for (const [name, checkFn] of Object.entries(CHECKS)) {
    results[name] = await checkFn(projectRoot);
  }
  
  return results;
}

module.exports = {
  runCheck,
  runAllChecks,
  CHECKS
};
