/**
 * todo 命令测试
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('flowmem todo', () => {
  let testDir: string;
  const binPath = path.resolve(__dirname, '../bin/flowmem.js');

  beforeEach(() => {
    // 创建临时测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmem-todo-test-'));
    // 初始化 .agentmem
    execSync(`node ${binPath} init`, { cwd: testDir, stdio: 'pipe' });
  });

  afterEach(() => {
    // 清理测试目录
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function runFlowmem(args: string): { stdout: string; exitCode: number } {
    try {
      const stdout = execSync(`node ${binPath} ${args}`, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { stdout, exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || error.message,
        exitCode: error.status || 1
      };
    }
  }

  describe('todo list', () => {
    it('should show empty message when no todos', () => {
      const result = runFlowmem('todo list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('暂无任务');
    });

    it('should list todos after adding', () => {
      runFlowmem('todo add "Test task"');
      const result = runFlowmem('todo list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Test task');
      expect(result.stdout).toContain('TODO-');
    });

    it('should support --json output', () => {
      runFlowmem('todo add "JSON test"');
      const result = runFlowmem('todo list --json');

      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data.todos).toBeInstanceOf(Array);
      expect(data.todos.length).toBe(1);
    });

    it('should filter by status', () => {
      runFlowmem('todo add "Pending task"');
      const result = runFlowmem('todo list --status pending');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Pending task');
    });
  });

  describe('todo add', () => {
    it('should add a new todo', () => {
      const result = runFlowmem('todo add "New task"');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('已添加任务');
      expect(result.stdout).toContain('TODO-');
    });

    it('should support --priority flag', () => {
      const result = runFlowmem('todo add "High priority" --priority high');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('high');
    });

    it('should support --phase flag', () => {
      const result = runFlowmem('todo add "Phase 3 task" --phase 3');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Phase 3');
    });

    it('should persist todo to todolist.md', () => {
      runFlowmem('todo add "Persistent task"');

      const todolistPath = path.join(testDir, '.agentmem', 'todolist.md');
      const content = fs.readFileSync(todolistPath, 'utf-8');
      expect(content).toContain('Persistent task');
    });
  });

  describe('todo set', () => {
    it('should update todo status', () => {
      // 添加任务并获取 ID
      const addResult = runFlowmem('todo add "Task to complete"');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      expect(idMatch).not.toBeNull();
      const todoId = idMatch![0];

      // 更新状态
      const result = runFlowmem(`todo set --id ${todoId} --status completed`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('已更新任务');
      expect(result.stdout).toContain('completed');
    });

    it('should update todo priority', () => {
      const addResult = runFlowmem('todo add "Task to prioritize"');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      const todoId = idMatch![0];

      const result = runFlowmem(`todo set --id ${todoId} --priority critical`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('critical');
    });

    it('should fail for non-existent todo', () => {
      const result = runFlowmem('todo set --id TODO-NONEXISTENT --status completed');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('未找到任务');
    });
  });

  describe('todo get', () => {
    it('should show todo details', () => {
      const addResult = runFlowmem('todo add "Detailed task" --priority high');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      const todoId = idMatch![0];

      const result = runFlowmem(`todo get ${todoId}`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Detailed task');
      expect(result.stdout).toContain('high');
    });

    it('should support --json output', () => {
      const addResult = runFlowmem('todo add "JSON detail task"');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      const todoId = idMatch![0];

      const result = runFlowmem(`todo get ${todoId} --json`);

      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data.id).toBe(todoId);
      expect(data.content).toBe('JSON detail task');
    });
  });

  describe('todo stats', () => {
    it('should show statistics', () => {
      runFlowmem('todo add "Task 1"');
      runFlowmem('todo add "Task 2"');

      const result = runFlowmem('todo stats');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('任务统计');
      expect(result.stdout).toContain('总任务: 2');
    });

    it('should show progress bar', () => {
      runFlowmem('todo add "Task 1"');
      const addResult = runFlowmem('todo add "Task 2"');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      runFlowmem(`todo set --id ${idMatch![0]} --status completed`);

      const result = runFlowmem('todo stats');

      expect(result.stdout).toContain('%');
    });
  });

  describe('todo delete', () => {
    it('should delete a todo', () => {
      const addResult = runFlowmem('todo add "Task to delete"');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      const todoId = idMatch![0];

      const result = runFlowmem(`todo delete ${todoId}`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('已删除任务');

      // 验证已删除
      const listResult = runFlowmem('todo list');
      expect(listResult.stdout).toContain('暂无任务');
    });
  });

  describe('todo clear', () => {
    it('should clear completed todos', () => {
      // 添加两个任务
      const add1 = runFlowmem('todo add "Task 1"');
      const add2 = runFlowmem('todo add "Task 2"');

      // 完成第一个
      const id1 = add1.stdout.match(/TODO-[\w-]+/)![0];
      runFlowmem(`todo set --id ${id1} --status completed`);

      // 清空已完成
      const result = runFlowmem('todo clear');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('已清空');

      // 验证只剩一个
      const listResult = runFlowmem('todo list --json');
      const data = JSON.parse(listResult.stdout);
      expect(data.todos.length).toBe(1);
    });
  });
});
