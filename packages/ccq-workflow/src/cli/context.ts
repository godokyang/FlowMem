/**
 * flowmem context 命令
 * 上下文刷新 - 一次性读取核心上下文文件
 */
import { Command } from 'commander';
import path from 'path';
import { getAgentmemPath, agentmemExists, readFile } from '../utils/file.js';

// 颜色代码 (ANSI)
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

/**
 * 分隔线
 */
function separator(): void {
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
}

/**
 * 提取文件前 N 行
 */
function summaryLines(content: string, lines: number = 20): string {
  const allLines = content.split('\n');
  const result = allLines.slice(0, lines).join('\n');

  if (allLines.length > lines) {
    return result + `\n\n${YELLOW}... 还有 ${allLines.length - lines} 行 (共 ${allLines.length} 行)${NC}`;
  }
  return result;
}

/**
 * 提取当前 Todo
 */
function extractCurrentTodo(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  // 查找进行中的 Todo (标记为 [/])
  const inProgress = lines.filter(line => /^\s*-\s*\[\/\]/.test(line));
  if (inProgress.length > 0) {
    result.push(...inProgress);
  } else {
    result.push('无进行中的 Todo');
  }

  result.push('');
  result.push(`${CYAN}下一个待办:${NC}`);

  // 查找下一个未完成的 Todo (标记为 [ ])
  const pending = lines.find(line => /^\s*-\s*\[\s\]/.test(line));
  if (pending) {
    result.push(pending);
  } else {
    result.push('无待办事项');
  }

  return result.join('\n');
}

export const contextCommand = new Command('context')
  .description('刷新上下文 - 一次性读取核心文件')
  .argument('[mode]', '模式: full(完整) | summary(摘要) | todo(仅任务)', 'full')
  .option('--json', '输出 JSON 格式')
  .action((mode, options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const agentmemPath = getAgentmemPath();

    // 读取文件
    const todolist = readFile(path.join(agentmemPath, 'todolist.md'));
    const request = readFile(path.join(agentmemPath, 'request.md'));
    const project = readFile(path.join(agentmemPath, 'project.md'));

    // JSON 输出
    if (options.json) {
      console.log(JSON.stringify({
        mode,
        todolist: todolist || null,
        request: request || null,
        project: project || null
      }, null, 2));
      return;
    }

    console.log('');
    separator();
    console.log(`${GREEN}  上下文刷新 - 模式: ${mode}${NC}`);
    separator();
    console.log('');

    switch (mode) {
      case 'todo':
        // 仅输出当前 Todo
        console.log(`${CYAN}【当前任务】${NC}`);
        if (todolist) {
          console.log(extractCurrentTodo(todolist));
        } else {
          console.log('todolist.md 不存在');
        }
        break;

      case 'summary':
        // 摘要模式
        console.log(`${CYAN}【1. 当前 Todo】${NC}`);
        if (todolist) {
          console.log(extractCurrentTodo(todolist));
        } else {
          console.log('todolist.md 不存在');
        }

        console.log('');
        separator();

        console.log(`${CYAN}【2. 需求摘要】${NC}`);
        if (request) {
          // 尝试提取需求理解部分
          const reqMatch = request.match(/## 需求理解[\s\S]*?(?=## 状态|$)/);
          if (reqMatch) {
            console.log(summaryLines(reqMatch[0], 20));
          } else {
            console.log(summaryLines(request, 15));
          }
        } else {
          console.log('request.md 不存在');
        }

        console.log('');
        separator();

        console.log(`${CYAN}【3. 项目概览】${NC}`);
        if (project) {
          console.log(summaryLines(project, 30));
        } else {
          console.log('project.md 不存在');
        }
        break;

      case 'full':
      default:
        // 完整模式
        console.log(`${CYAN}【1. todolist.md】${NC}`);
        if (todolist) {
          console.log(todolist);
        } else {
          console.log('文件不存在');
        }

        console.log('');
        separator();

        console.log(`${CYAN}【2. request.md】${NC}`);
        if (request) {
          console.log(request);
        } else {
          console.log('文件不存在');
        }

        console.log('');
        separator();

        console.log(`${CYAN}【3. project.md】${NC}`);
        if (project) {
          console.log(project);
        } else {
          console.log('文件不存在');
        }
        break;
    }

    console.log('');
    separator();
    console.log(`${GREEN}  刷新完成${NC}`);
    separator();
    console.log('');
  });
