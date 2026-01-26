/**
 * audit 命令测试
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('flowmem audit', () => {
  let testDir: string;
  const binPath = path.resolve(__dirname, '../bin/flowmem.js');

  beforeEach(() => {
    // 创建临时测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmem-audit-test-'));
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

  describe('audit (all checks)', () => {
    it('should run all checks', () => {
      const result = runFlowmem('audit');

      expect(result.stdout).toContain('运行审核检查');
      expect(result.stdout).toContain('检查偷懒代码');
      expect(result.stdout).toContain('检查任务完成情况');
      expect(result.stdout).toContain('检查文件同步状态');
    });

    it('should pass when no issues', () => {
      const result = runFlowmem('audit');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('通过');
    });
  });

  describe('audit lazy', () => {
    it('should detect TODO comments', () => {
      // 创建包含 TODO 的文件
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'test.ts'),
        `function test() {
          // TODO: implement this
          console.log('TODO');
        }`
      );

      const result = runFlowmem('audit lazy ./src');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('偷懒代码');
    });

    it('should detect empty functions', () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'empty.ts'),
        `function emptyFunc() {}`
      );

      const result = runFlowmem('audit lazy ./src');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('空函数');
    });

    it('should detect Not implemented errors', () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'notimpl.ts'),
        `function notImpl() {
          throw new Error('Not implemented');
        }`
      );

      const result = runFlowmem('audit lazy ./src');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('未实现');
    });

    it('should pass for clean code', () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'clean.ts'),
        `function add(a: number, b: number): number {
          return a + b;
        }`
      );

      const result = runFlowmem('audit lazy ./src');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('未发现偷懒代码');
    });
  });

  describe('audit debt', () => {
    it('should detect @deprecated', () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'deprecated.ts'),
        `/** @deprecated Use newFunc instead */
        function oldFunc() {}`
      );

      const result = runFlowmem('audit debt ./src');

      expect(result.stdout).toContain('已废弃代码');
    });

    it('should detect ts-ignore', () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'ignore.ts'),
        `// @ts-ignore
        const x: string = 123;`
      );

      const result = runFlowmem('audit debt ./src');

      expect(result.stdout).toContain('TypeScript 忽略');
    });
  });

  describe('audit --todo', () => {
    it('should check todo completion', () => {
      // 添加一个未完成的任务
      runFlowmem('todo add "Incomplete task"');

      const result = runFlowmem('audit --todo');

      expect(result.stdout).toContain('未完成任务');
    });

    it('should pass when all todos completed', () => {
      // 添加并完成任务
      const addResult = runFlowmem('todo add "Task to complete"');
      const idMatch = addResult.stdout.match(/TODO-[\w-]+/);
      runFlowmem(`todo set --id ${idMatch![0]} --status completed`);

      const result = runFlowmem('audit --todo');

      expect(result.stdout).toContain('所有任务已完成');
    });
  });

  describe('audit --sync', () => {
    it('should check file sync status', () => {
      const result = runFlowmem('audit --sync');

      expect(result.stdout).toContain('session.json 格式有效');
    });

    it('should detect invalid session.json', () => {
      // 破坏 session.json
      fs.writeFileSync(
        path.join(testDir, '.agentmem', 'session.json'),
        'invalid json'
      );

      const result = runFlowmem('audit --sync');

      expect(result.stdout).toContain('格式无效');
    });
  });

  describe('audit dependency-check', () => {
    it('should pass with no dependencies', () => {
      const result = runFlowmem('audit dependency-check');

      expect(result.exitCode).toBe(0);
    });
  });

  describe('audit pre-commit', () => {
    it('should run pre-commit checks', () => {
      const result = runFlowmem('audit pre-commit');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Pre-commit 检查通过');
    });

    it('should fail if lazy code detected', () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'lazy.ts'),
        `console.log('TODO');`
      );

      const result = runFlowmem('audit pre-commit');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('Pre-commit 检查失败');
    });
  });

  describe('audit --json', () => {
    it('should output JSON format', () => {
      // 创建一个干净的 src 目录
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(
        path.join(srcDir, 'clean.ts'),
        `function add(a: number, b: number): number { return a + b; }`
      );

      const result = runFlowmem('audit lazy ./src --json');

      expect(result.exitCode).toBe(0);
      // 干净代码应该输出空数组
      const data = JSON.parse(result.stdout);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });
});
