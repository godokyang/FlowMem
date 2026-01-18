const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');

/**
 * 解析 todolist.md 文件（YAML Frontmatter 格式）
 * @param {string} filePath - todolist.md 文件路径
 * @returns {Object} 解析结果 { meta, todos, markdownBody }
 */
function parseTodoList(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`TodoList 文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否包含 YAML Frontmatter
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    // 如果没有 YAML Frontmatter，尝试解析传统格式
    return parseLegacyFormat(content);
  }
  
  const [, frontmatterStr, markdownBody] = match;
  
  try {
    const data = yaml.load(frontmatterStr);
    
    return {
      meta: data.meta || {},
      todos: data.todos || [],
      markdownBody: markdownBody.trim(),
      format: 'yaml'
    };
  } catch (err) {
    throw new Error(`YAML 解析失败: ${err.message}`);
  }
}

/**
 * 解析传统格式的 todolist.md（向后兼容）
 * @param {string} content - 文件内容
 * @returns {Object} 解析结果
 */
function parseLegacyFormat(content) {
  const todos = [];
  
  const lines = content.split('\n');
  const taskRegex = /^- \[([ x\/\-])\] \*\*(TODO-\d+)\*\*:\s*(.+)$/;
  
  for (const line of lines) {
    const match = line.match(taskRegex);
    if (match) {
      const [, statusChar, id, description] = match;
      
      const statusMap = {
        ' ': 'pending',
        '/': 'in_progress',
        'x': 'completed',
        '-': 'cancelled'
      };
      
      todos.push({
        id,
        content: description.trim(),
        status: statusMap[statusChar] || 'pending',
        priority: 'medium',
        estimate: '',
        dependencies: [],
        phase: '',
        log: ''
      });
    }
  }
  
  return {
    meta: {},
    todos,
    markdownBody: content,
    format: 'legacy'
  };
}

/**
 * 生成进度条
 * @param {Object} stats - 统计数据 { total, completed, inProgress, pending, cancelled }
 * @param {number} width - 进度条宽度（字符数）
 * @returns {string} 进度条字符串
 */
function generateProgressBar(stats, width = 20) {
  const { total, completed } = stats;
  
  if (total === 0) {
    return `[${'░'.repeat(width)}] 0%`;
  }
  
  const percentage = Math.round((completed / total) * 100);
  const filledWidth = Math.round((completed / total) * width);
  const emptyWidth = width - filledWidth;
  
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  
  return `[${filled}${empty}] ${percentage}%`;
}

/**
 * 计算任务统计数据
 * @param {Array} todos - 任务列表
 * @returns {Object} 统计数据
 */
function calculateStats(todos) {
  const stats = {
    total: todos.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    cancelled: 0
  };
  
  todos.forEach(todo => {
    switch (todo.status) {
      case 'completed':
        stats.completed++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'pending':
        stats.pending++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
    }
  });
  
  return stats;
}

/**
 * 计算预估总时间
 * @param {Array} todos - 任务列表
 * @returns {string} 格式化的总时间（如 "2h 30m"）
 */
function calculateTotalTime(todos) {
  let totalMinutes = 0;
  
  todos.forEach(todo => {
    if (!todo.estimate) return;
    
    const estimate = todo.estimate.toLowerCase();
    
    // 解析时间格式：5m, 30m, 1h, 2h, 1d
    const minuteMatch = estimate.match(/^(\d+)m$/);
    const hourMatch = estimate.match(/^(\d+)h$/);
    const dayMatch = estimate.match(/^(\d+)d$/);
    
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    } else if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    } else if (dayMatch) {
      totalMinutes += parseInt(dayMatch[1]) * 8 * 60; // 1 天 = 8 小时
    }
  });
  
  if (totalMinutes === 0) return '0m';
  
  const days = Math.floor(totalMinutes / (8 * 60));
  const hours = Math.floor((totalMinutes % (8 * 60)) / 60);
  const minutes = totalMinutes % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ');
}

/**
 * 更新 todolist.md 文件
 * @param {string} filePath - 文件路径
 * @param {Object} data - { meta, todos }
 * @param {boolean} updateProgress - 是否更新进度条（默认 true）
 */
function updateTodoList(filePath, data, updateProgress = true) {
  const { meta, todos } = data;
  
  // 生成 YAML Frontmatter
  const frontmatter = yaml.dump({ meta, todos }, {
    indent: 2,
    lineWidth: -1, // 不自动换行
    noRefs: true
  });
  
  // 计算统计数据
  const stats = calculateStats(todos);
  const totalTime = calculateTotalTime(todos);
  const progressBar = generateProgressBar(stats);
  
  // 生成 Markdown Body
  let markdownBody = generateMarkdownBody(data, stats, totalTime, progressBar);
  
  // 组合最终内容
  const finalContent = `---\n${frontmatter}---\n\n${markdownBody}`;
  
  fs.writeFileSync(filePath, finalContent, 'utf-8');
}

/**
 * 生成 Markdown Body
 * @param {Object} data - { meta, todos }
 * @param {Object} stats - 统计数据
 * @param {string} totalTime - 总时间
 * @param {string} progressBar - 进度条
 * @returns {string} Markdown 内容
 */
function generateMarkdownBody(data, stats, totalTime, progressBar) {
  const { meta, todos } = data;
  
  let md = `# 任务清单: ${meta.title || '[未命名任务]'}\n\n`;
  md += `> **关联需求**: [request.md](${meta.request || 'request.md'})\n\n`;
  
  // 进度统计
  md += `## 📊 进度统计\n\`\`\`\n`;
  md += `总任务: ${stats.total}\n`;
  md += `已完成: ${stats.completed} (${Math.round(stats.completed / stats.total * 100) || 0}%)\n`;
  md += `进行中: ${stats.inProgress} (${Math.round(stats.inProgress / stats.total * 100) || 0}%)\n`;
  md += `待开始: ${stats.pending} (${Math.round(stats.pending / stats.total * 100) || 0}%)\n`;
  md += `已取消: ${stats.cancelled} (${Math.round(stats.cancelled / stats.total * 100) || 0}%)\n\n`;
  md += `${progressBar}\n`;
  md += `\`\`\`\n\n`;
  md += `**预计总时间**: ${totalTime}\n\n`;
  md += `---\n\n`;
  
  // 当前任务
  const currentTask = todos.find(t => t.status === 'in_progress');
  md += `## 当前任务\n`;
  if (currentTask) {
    md += `- [/] **${currentTask.id}**: ${currentTask.content} (进行中)\n\n`;
  } else {
    md += `暂无进行中的任务\n\n`;
  }
  md += `---\n\n`;
  
  // 按阶段分组任务
  const phases = {};
  todos.forEach(todo => {
    const phase = todo.phase || '未分类';
    if (!phases[phase]) phases[phase] = [];
    phases[phase].push(todo);
  });
  
  md += `## 📋 任务列表\n\n`;
  
  Object.keys(phases).forEach(phase => {
    md += `### ${phase}\n\n`;
    
    phases[phase].forEach(todo => {
      const statusChar = {
        'pending': ' ',
        'in_progress': '/',
        'completed': 'x',
        'cancelled': '-'
      }[todo.status] || ' ';
      
      const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      }[todo.priority] || '⚪';
      
      md += `- [${statusChar}] **${todo.id}**: ${todo.content}\n`;
      md += `  - 优先级: ${priorityEmoji} ${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}\n`;
      
      if (todo.estimate) {
        md += `  - 预计: ${todo.estimate}\n`;
      }
      
      if (todo.dependencies && todo.dependencies.length > 0) {
        md += `  - 依赖: ${todo.dependencies.join(', ')}\n`;
      }
      
      if (todo.log) {
        md += `  - 日志: [${path.basename(todo.log)}](${todo.log})\n`;
      }
      
      md += `\n`;
    });
  });
  
  md += `---\n\n`;
  md += `## 💡 注意事项\n\n`;
  md += `1. **YAML Frontmatter 必须完整**：不要删除 \`---\` 分隔符\n`;
  md += `2. **ID 必须唯一**：每个 todo 的 id 不能重复\n`;
  md += `3. **依赖关系必须有效**：dependencies 中的 ID 必须存在\n`;
  md += `4. **时间格式必须标准化**：使用 5m/1h/2d 格式\n`;
  md += `5. **进度条自动更新**：每次修改任务状态后自动刷新\n`;
  
  return md;
}

/**
 * 验证依赖关系
 * @param {Array} todos - 任务列表
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateDependencies(todos) {
  const errors = [];
  const todoIds = new Set(todos.map(t => t.id));
  
  // 检查依赖 ID 是否存在
  todos.forEach(todo => {
    if (!todo.dependencies || todo.dependencies.length === 0) return;
    
    todo.dependencies.forEach(depId => {
      if (!todoIds.has(depId)) {
        errors.push({
          type: 'missing_dependency',
          todo: todo.id,
          dependency: depId,
          message: `任务 ${todo.id} 依赖的 ${depId} 不存在`
        });
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检测循环依赖（DFS 算法）
 * @param {Array} todos - 任务列表
 * @returns {Object} { hasCircular: boolean, cycles: Array }
 */
function detectCircularDependencies(todos) {
  const graph = {};
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];
  
  // 构建依赖图
  todos.forEach(todo => {
    graph[todo.id] = todo.dependencies || [];
  });
  
  // DFS 检测环
  function dfs(node, path = []) {
    if (recursionStack.has(node)) {
      // 找到环
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return true;
    }
    
    if (visited.has(node)) {
      return false;
    }
    
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const dependencies = graph[node] || [];
    for (const dep of dependencies) {
      if (dfs(dep, [...path])) {
        // 继续检测其他可能的环
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  // 对每个节点运行 DFS
  Object.keys(graph).forEach(node => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });
  
  return {
    hasCircular: cycles.length > 0,
    cycles: cycles.map(cycle => cycle.join(' → '))
  };
}

/**
 * 验证时间格式
 * @param {string} estimate - 时间字符串
 * @returns {boolean} 是否有效
 */
function validateTimeFormat(estimate) {
  if (!estimate) return true; // 空值允许
  
  const validFormats = /^(\d+)(m|h|d)$/;
  return validFormats.test(estimate.toLowerCase());
}

module.exports = {
  parseTodoList,
  parseLegacyFormat,
  generateProgressBar,
  calculateStats,
  calculateTotalTime,
  updateTodoList,
  generateMarkdownBody,
  validateDependencies,
  detectCircularDependencies,
  validateTimeFormat
};
