/**
 * guard 命令测试
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('flowmem guard', () => {
  let testDir: string;
  const binPath = path.resolve(__dirname, '../bin/flowmem.js');

  beforeEach(() => {
    // 创建临时测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmem-guard-test-'));
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

  describe('guard check-protected', () => {
    it('should block protected files', () => {
      const result = runFlowmem('guard check-protected package.json');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('受保护');
    });

    it('should allow non-protected files', () => {
      const result = runFlowmem('guard check-protected src/app.ts');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('可修改');
    });

    it('should block .env files', () => {
      const result = runFlowmem('guard check-protected .env');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('受保护');
    });

    it('should support --json output', () => {
      const result = runFlowmem('guard check-protected package.json --json');

      const data = JSON.parse(result.stdout);
      expect(data.allowed).toBe(false);
      expect(data.rule).toBe('protected_file');
    });
  });

  describe('guard check-risk', () => {
    it('should flag auth/ as high risk', () => {
      const result = runFlowmem('guard check-risk src/auth/login.ts');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('高风险');
    });

    it('should flag security/ as high risk', () => {
      const result = runFlowmem('guard check-risk security/crypto.ts');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('高风险');
    });

    it('should flag migrations/ as high risk', () => {
      const result = runFlowmem('guard check-risk db/migrations/001.sql');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('高风险');
    });

    it('should allow safe paths', () => {
      const result = runFlowmem('guard check-risk src/components/Button.tsx');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('安全');
    });

    it('should support --json output', () => {
      const result = runFlowmem('guard check-risk src/auth/login.ts --json');

      const data = JSON.parse(result.stdout);
      expect(data.allowed).toBe(false);
      expect(data.rule).toBe('high_risk_path');
    });
  });

  describe('guard check', () => {
    it('should perform combined check', () => {
      const result = runFlowmem('guard check src/app.ts');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('检查通过');
    });

    it('should block protected files', () => {
      const result = runFlowmem('guard check package.json');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('受保护');
    });

    it('should warn for high risk paths', () => {
      const result = runFlowmem('guard check src/auth/login.ts');

      expect(result.stdout).toContain('高风险');
    });
  });

  describe('guard log-change', () => {
    it('should log file changes', () => {
      const result = runFlowmem('guard log-change src/app.ts -o modify');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('已记录变更');

      // 验证日志文件
      const tracePath = path.join(testDir, '.agentmem', 'logs', 'trace.jsonl');
      expect(fs.existsSync(tracePath)).toBe(true);

      const content = fs.readFileSync(tracePath, 'utf-8');
      expect(content).toContain('src/app.ts');
      expect(content).toContain('modify');
    });

    it('should support different operations', () => {
      runFlowmem('guard log-change src/new.ts -o create');
      runFlowmem('guard log-change src/old.ts -o delete');

      const tracePath = path.join(testDir, '.agentmem', 'logs', 'trace.jsonl');
      const content = fs.readFileSync(tracePath, 'utf-8');

      expect(content).toContain('create');
      expect(content).toContain('delete');
    });

    it('should support --json output', () => {
      const result = runFlowmem('guard log-change src/app.ts -o modify --json');

      const data = JSON.parse(result.stdout);
      expect(data.logged).toBe(true);
      expect(data.file).toBe('src/app.ts');
    });
  });

  describe('guard list-protected', () => {
    it('should list protected files', () => {
      const result = runFlowmem('guard list-protected');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('受保护文件');
      expect(result.stdout).toContain('package.json');
      expect(result.stdout).toContain('.env');
    });

    it('should list high risk paths', () => {
      const result = runFlowmem('guard list-protected');

      expect(result.stdout).toContain('高风险路径');
      expect(result.stdout).toContain('auth/');
      expect(result.stdout).toContain('security/');
    });

    it('should support --json output', () => {
      const result = runFlowmem('guard list-protected --json');

      const data = JSON.parse(result.stdout);
      expect(data.protectedFiles).toBeInstanceOf(Array);
      expect(data.highRiskPaths).toBeInstanceOf(Array);
    });
  });

  describe('guard trace', () => {
    it('should show empty message when no logs', () => {
      const result = runFlowmem('guard trace');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('暂无变更记录');
    });

    it('should show recent changes', () => {
      // 记录一些变更
      runFlowmem('guard log-change src/a.ts -o create');
      runFlowmem('guard log-change src/b.ts -o modify');

      const result = runFlowmem('guard trace');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('变更记录');
      expect(result.stdout).toContain('src/a.ts');
      expect(result.stdout).toContain('src/b.ts');
    });

    it('should limit output with -n flag', () => {
      // 记录多个变更
      for (let i = 0; i < 5; i++) {
        runFlowmem(`guard log-change src/file${i}.ts -o modify`);
      }

      const result = runFlowmem('guard trace -n 2');

      expect(result.stdout).toContain('2 条');
    });
  });

  describe('guard check-core-mem', () => {
    it('should pass when core files exist', () => {
      // 创建 request.md 使核心文件完整
      fs.writeFileSync(
        path.join(testDir, '.agentmem', 'request.md'),
        '# Request\n\nTest request'
      );

      const result = runFlowmem('guard check-core-mem');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('检查通过');
    });

    it('should warn when request.md missing during task', () => {
      // 创建 todolist.md 但删除 request.md
      fs.unlinkSync(path.join(testDir, '.agentmem', 'todolist.md'));
      fs.writeFileSync(
        path.join(testDir, '.agentmem', 'todolist.md'),
        '# Tasks\n- [ ] Task 1'
      );

      const result = runFlowmem('guard check-core-mem');

      // 应该警告但不阻塞
      expect(result.exitCode).toBe(0);
    });
  });

  describe('guard check-todo-align', () => {
    it('should pass when no todolist', () => {
      fs.unlinkSync(path.join(testDir, '.agentmem', 'todolist.md'));

      const result = runFlowmem('guard check-todo-align src/app.ts');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('跳过');
    });

    it('should warn when no in-progress todo', () => {
      const result = runFlowmem('guard check-todo-align src/app.ts');

      // 默认 todolist 没有进行中的任务
      expect(result.exitCode).toBe(0);
    });
  });
});
