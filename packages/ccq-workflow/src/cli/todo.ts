/**
 * flowmem todo 命令
 * 管理 todolist.md 任务清单
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import {
  getAgentmemPath,
  agentmemExists,
  readFile,
  writeFile,
  getTimestamp,
  generateId,
  parseFrontmatter,
  generateFrontmatter
} from '../utils/file.js';
import type { TodoItem, TodoStatus, TodoPriority } from '../core/types.js';

// Todo 状态图标
const STATUS_ICONS: Record<TodoStatus, string> = {
  pending: '⬜',
  in_progress: '🔄',
  completed: '✅',
  blocked: '🚫',
  skipped: '⏭️'
};

// 优先级图标
const PRIORITY_ICONS: Record<TodoPriority, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢'
};

/**
 * 解析 todolist.md 文件
 */
function parseTodolist(content: string): { frontmatter: Record<string, unknown>; todos: TodoItem[] } {
  const parsed = parseFrontmatter<Record<string, unknown>>(content);
  if (!parsed) {
    return { frontmatter: {}, todos: [] };
  }

  const todos: TodoItem[] = [];
  const lines = parsed.body.split('\n');

  // 解析 todo 项 (格式: - [x] TODO-XXX: 内容 [priority:high] [phase:1])
  const todoRegex = /^- \[([ x])\] (TODO-[\w-]+): (.+?)(?:\s+\[priority:(\w+)\])?(?:\s+\[phase:(\d+)\])?$/;

  for (const line of lines) {
    const match = line.match(todoRegex);
    if (match) {
      const [, checked, id, content, priority, phase] = match;
      todos.push({
        id,
        content: content.trim(),
        status: checked === 'x' ? 'completed' : 'pending',
        priority: (priority as TodoPriority) || 'medium',
        phase: phase ? parseInt(phase, 10) : undefined,
        created_at: getTimestamp(),
        updated_at: getTimestamp()
      });
    }
  }

  return { frontmatter: parsed.frontmatter, todos };
}

/**
 * 生成 todolist.md 内容
 */
function generateTodolist(frontmatter: Record<string, unknown>, todos: TodoItem[]): string {
  const lines: string[] = [];

  // 更新 frontmatter
  frontmatter.updated_at = getTimestamp();
  frontmatter.total_todos = todos.length;
  frontmatter.completed_todos = todos.filter(t => t.status === 'completed').length;

  lines.push(generateFrontmatter(frontmatter));
  lines.push('');
  lines.push('# 任务清单');
  lines.push('');

  // 按 phase 分组
  const phases = new Map<number, TodoItem[]>();
  const noPhase: TodoItem[] = [];

  for (const todo of todos) {
    if (todo.phase !== undefined) {
      if (!phases.has(todo.phase)) {
        phases.set(todo.phase, []);
      }
      phases.get(todo.phase)!.push(todo);
    } else {
      noPhase.push(todo);
    }
  }

  // 输出各 phase 的任务
  const phaseNames = ['', 'Phase 1: 需求澄清', 'Phase 2: 详细规划', 'Phase 3: 执行与审核', 'Phase 4: 交付'];

  for (let phase = 1; phase <= 4; phase++) {
    lines.push(`## ${phaseNames[phase]}`);
    lines.push('');

    const phaseTodos = phases.get(phase) || [];
    if (phaseTodos.length === 0) {
      lines.push('_暂无任务_');
    } else {
      for (const todo of phaseTodos) {
        const checked = todo.status === 'completed' ? 'x' : ' ';
        const priorityTag = todo.priority !== 'medium' ? ` [priority:${todo.priority}]` : '';
        lines.push(`- [${checked}] ${todo.id}: ${todo.content}${priorityTag} [phase:${phase}]`);
      }
    }
    lines.push('');
  }

  // 输出无 phase 的任务
  if (noPhase.length > 0) {
    lines.push('## 其他任务');
    lines.push('');
    for (const todo of noPhase) {
      const checked = todo.status === 'completed' ? 'x' : ' ';
      const priorityTag = todo.priority !== 'medium' ? ` [priority:${todo.priority}]` : '';
      lines.push(`- [${checked}] ${todo.id}: ${todo.content}${priorityTag}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 获取 todolist 文件路径
 */
function getTodolistPath(cwd: string = process.cwd()): string {
  return path.join(getAgentmemPath(cwd), 'todolist.md');
}

/**
 * 读取 todolist
 */
function loadTodolist(cwd: string = process.cwd()): { frontmatter: Record<string, unknown>; todos: TodoItem[] } {
  const filePath = getTodolistPath(cwd);
  const content = readFile(filePath);

  if (!content) {
    return {
      frontmatter: {
        created_at: getTimestamp(),
        updated_at: getTimestamp(),
        request_id: '',
        total_todos: 0,
        completed_todos: 0,
        current_phase: 0
      },
      todos: []
    };
  }

  return parseTodolist(content);
}

/**
 * 保存 todolist
 */
function saveTodolist(frontmatter: Record<string, unknown>, todos: TodoItem[], cwd: string = process.cwd()): void {
  const filePath = getTodolistPath(cwd);
  const content = generateTodolist(frontmatter, todos);
  writeFile(filePath, content);
}

// 主命令
export const todoCommand = new Command('todo')
  .description('管理任务清单');

// list 子命令
todoCommand
  .command('list')
  .description('列出所有任务')
  .option('-s, --status <status>', '按状态筛选 (pending|in_progress|completed|blocked|skipped)')
  .option('-p, --phase <phase>', '按阶段筛选 (1-4)')
  .option('--json', '输出 JSON 格式')
  .action((options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { frontmatter, todos } = loadTodolist();

    let filtered = todos;

    // 按状态筛选
    if (options.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }

    // 按阶段筛选
    if (options.phase) {
      const phase = parseInt(options.phase, 10);
      filtered = filtered.filter(t => t.phase === phase);
    }

    // JSON 输出
    if (options.json) {
      console.log(JSON.stringify({ frontmatter, todos: filtered }, null, 2));
      return;
    }

    // 表格输出
    if (filtered.length === 0) {
      console.log('📋 暂无任务');
      return;
    }

    console.log('📋 任务清单\n');
    console.log('ID            | 状态 | 优先级 | 阶段 | 内容');
    console.log('--------------|------|--------|------|------');

    for (const todo of filtered) {
      const statusIcon = STATUS_ICONS[todo.status];
      const priorityIcon = PRIORITY_ICONS[todo.priority];
      const phase = todo.phase ? `P${todo.phase}` : '-';
      const content = todo.content.length > 40 ? todo.content.slice(0, 37) + '...' : todo.content;
      console.log(`${todo.id.padEnd(13)} | ${statusIcon}   | ${priorityIcon}     | ${phase.padEnd(4)} | ${content}`);
    }

    console.log('');
    console.log(`总计: ${filtered.length} 个任务`);
  });

// add 子命令
todoCommand
  .command('add')
  .description('添加新任务')
  .argument('<content>', '任务内容')
  .option('-p, --priority <priority>', '优先级 (critical|high|medium|low)', 'medium')
  .option('--phase <phase>', '所属阶段 (1-4)')
  .option('--id <id>', '指定 ID (默认自动生成)')
  .action((content, options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { frontmatter, todos } = loadTodolist();

    const newTodo: TodoItem = {
      id: options.id || generateId('TODO'),
      content,
      status: 'pending',
      priority: options.priority as TodoPriority,
      phase: options.phase ? parseInt(options.phase, 10) : undefined,
      created_at: getTimestamp(),
      updated_at: getTimestamp()
    };

    todos.push(newTodo);
    saveTodolist(frontmatter, todos);

    console.log(`✅ 已添加任务: ${newTodo.id}`);
    console.log(`   内容: ${content}`);
    console.log(`   优先级: ${PRIORITY_ICONS[newTodo.priority]} ${newTodo.priority}`);
    if (newTodo.phase) {
      console.log(`   阶段: Phase ${newTodo.phase}`);
    }
  });

// set 子命令
todoCommand
  .command('set')
  .description('更新任务状态')
  .requiredOption('--id <id>', '任务 ID')
  .option('-s, --status <status>', '新状态 (pending|in_progress|completed|blocked|skipped)')
  .option('-p, --priority <priority>', '新优先级 (critical|high|medium|low)')
  .option('--phase <phase>', '新阶段 (1-4)')
  .option('--note <note>', '添加备注')
  .action((options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { frontmatter, todos } = loadTodolist();

    const todo = todos.find(t => t.id === options.id);
    if (!todo) {
      console.error(`❌ 未找到任务: ${options.id}`);
      process.exit(1);
    }

    // 更新字段
    if (options.status) {
      todo.status = options.status as TodoStatus;
      if (options.status === 'completed') {
        todo.completed_at = getTimestamp();
      }
    }
    if (options.priority) {
      todo.priority = options.priority as TodoPriority;
    }
    if (options.phase) {
      todo.phase = parseInt(options.phase, 10);
    }
    if (options.note) {
      todo.notes = options.note;
    }

    todo.updated_at = getTimestamp();

    saveTodolist(frontmatter, todos);

    console.log(`✅ 已更新任务: ${todo.id}`);
    console.log(`   状态: ${STATUS_ICONS[todo.status]} ${todo.status}`);
    console.log(`   优先级: ${PRIORITY_ICONS[todo.priority]} ${todo.priority}`);
  });

// get 子命令
todoCommand
  .command('get')
  .description('获取任务详情')
  .argument('<id>', '任务 ID')
  .option('--json', '输出 JSON 格式')
  .action((id, options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { todos } = loadTodolist();

    const todo = todos.find(t => t.id === id);
    if (!todo) {
      console.error(`❌ 未找到任务: ${id}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(todo, null, 2));
      return;
    }

    console.log(`📋 任务详情: ${todo.id}\n`);
    console.log(`内容: ${todo.content}`);
    console.log(`状态: ${STATUS_ICONS[todo.status]} ${todo.status}`);
    console.log(`优先级: ${PRIORITY_ICONS[todo.priority]} ${todo.priority}`);
    if (todo.phase) {
      console.log(`阶段: Phase ${todo.phase}`);
    }
    console.log(`创建时间: ${todo.created_at}`);
    console.log(`更新时间: ${todo.updated_at}`);
    if (todo.completed_at) {
      console.log(`完成时间: ${todo.completed_at}`);
    }
    if (todo.notes) {
      console.log(`备注: ${todo.notes}`);
    }
  });

// stats 子命令
todoCommand
  .command('stats')
  .description('显示任务统计')
  .option('--json', '输出 JSON 格式')
  .action((options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { frontmatter, todos } = loadTodolist();

    // 统计各状态数量
    const statusCounts: Record<TodoStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      skipped: 0
    };

    // 统计各阶段数量
    const phaseCounts: Record<number, { total: number; completed: number }> = {
      1: { total: 0, completed: 0 },
      2: { total: 0, completed: 0 },
      3: { total: 0, completed: 0 },
      4: { total: 0, completed: 0 }
    };

    for (const todo of todos) {
      statusCounts[todo.status]++;
      if (todo.phase && phaseCounts[todo.phase]) {
        phaseCounts[todo.phase].total++;
        if (todo.status === 'completed') {
          phaseCounts[todo.phase].completed++;
        }
      }
    }

    const total = todos.length;
    const completed = statusCounts.completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (options.json) {
      console.log(JSON.stringify({
        total,
        completed,
        progress,
        statusCounts,
        phaseCounts,
        currentPhase: frontmatter.current_phase
      }, null, 2));
      return;
    }

    // 进度条
    const barLength = 20;
    const filledLength = Math.round((progress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    console.log('📊 任务统计\n');
    console.log(`[${bar}] ${progress}%`);
    console.log(`总任务: ${total} | 已完成: ${completed}\n`);

    console.log('按状态:');
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > 0) {
        console.log(`  ${STATUS_ICONS[status as TodoStatus]} ${status}: ${count}`);
      }
    }

    console.log('\n按阶段:');
    const phaseNames = ['', '需求澄清', '详细规划', '执行与审核', '交付'];
    for (let phase = 1; phase <= 4; phase++) {
      const { total: phaseTotal, completed: phaseCompleted } = phaseCounts[phase];
      if (phaseTotal > 0) {
        const phaseProgress = Math.round((phaseCompleted / phaseTotal) * 100);
        console.log(`  Phase ${phase} (${phaseNames[phase]}): ${phaseCompleted}/${phaseTotal} (${phaseProgress}%)`);
      }
    }
  });

// delete 子命令
todoCommand
  .command('delete')
  .description('删除任务')
  .argument('<id>', '任务 ID')
  .option('-f, --force', '强制删除（不确认）')
  .action((id, options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { frontmatter, todos } = loadTodolist();

    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      console.error(`❌ 未找到任务: ${id}`);
      process.exit(1);
    }

    const todo = todos[index];

    if (!options.force && todo.status === 'in_progress') {
      console.error(`⚠️  任务 ${id} 正在进行中。使用 --force 强制删除。`);
      process.exit(1);
    }

    todos.splice(index, 1);
    saveTodolist(frontmatter, todos);

    console.log(`✅ 已删除任务: ${id}`);
  });

// clear 子命令
todoCommand
  .command('clear')
  .description('清空已完成的任务')
  .option('--all', '清空所有任务')
  .option('-f, --force', '强制清空（不确认）')
  .action((options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const { frontmatter, todos } = loadTodolist();

    let remaining: TodoItem[];
    let removed: number;

    if (options.all) {
      if (!options.force) {
        console.error('⚠️  将清空所有任务。使用 --force 确认。');
        process.exit(1);
      }
      removed = todos.length;
      remaining = [];
    } else {
      remaining = todos.filter(t => t.status !== 'completed');
      removed = todos.length - remaining.length;
    }

    saveTodolist(frontmatter, remaining);

    console.log(`✅ 已清空 ${removed} 个任务`);
    console.log(`   剩余: ${remaining.length} 个任务`);
  });
