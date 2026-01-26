/**
 * init 命令测试
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('flowmem init', () => {
  let testDir: string;
  const binPath = path.resolve(__dirname, '../bin/flowmem.js');

  beforeEach(() => {
    // 创建临时测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmem-init-test-'));
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

  describe('basic initialization', () => {
    it('should create .agentmem directory', () => {
      const result = runFlowmem('init');

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(testDir, '.agentmem'))).toBe(true);
    });

    it('should create required subdirectories', () => {
      runFlowmem('init');

      const expectedDirs = ['logs', 'implementation', 'notepad', 'history', '.lock'];
      for (const dir of expectedDirs) {
        expect(fs.existsSync(path.join(testDir, '.agentmem', dir))).toBe(true);
      }
    });

    it('should create project.md', () => {
      runFlowmem('init');

      const projectPath = path.join(testDir, '.agentmem', 'project.md');
      expect(fs.existsSync(projectPath)).toBe(true);

      const content = fs.readFileSync(projectPath, 'utf-8');
      expect(content).toContain('# 项目配置');
    });

    it('should create todolist.md', () => {
      runFlowmem('init');

      const todolistPath = path.join(testDir, '.agentmem', 'todolist.md');
      expect(fs.existsSync(todolistPath)).toBe(true);

      const content = fs.readFileSync(todolistPath, 'utf-8');
      expect(content).toContain('# 任务清单');
    });

    it('should create session.json', () => {
      runFlowmem('init');

      const sessionPath = path.join(testDir, '.agentmem', 'session.json');
      expect(fs.existsSync(sessionPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      expect(content).toHaveProperty('session_id');
      expect(content).toHaveProperty('status', 'active');
    });

    it('should create .gitignore', () => {
      runFlowmem('init');

      const gitignorePath = path.join(testDir, '.agentmem', '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
    });
  });

  describe('--force flag', () => {
    it('should not overwrite existing files without --force', () => {
      // 第一次初始化
      runFlowmem('init');

      // 修改 project.md
      const projectPath = path.join(testDir, '.agentmem', 'project.md');
      fs.writeFileSync(projectPath, 'custom content');

      // 第二次初始化（不带 --force）
      runFlowmem('init');

      // 文件应该保持不变
      expect(fs.readFileSync(projectPath, 'utf-8')).toBe('custom content');
    });

    it('should overwrite existing files with --force', () => {
      // 第一次初始化
      runFlowmem('init');

      // 修改 project.md
      const projectPath = path.join(testDir, '.agentmem', 'project.md');
      fs.writeFileSync(projectPath, 'custom content');

      // 第二次初始化（带 --force）
      runFlowmem('init --force');

      // 文件应该被覆盖
      const content = fs.readFileSync(projectPath, 'utf-8');
      expect(content).not.toBe('custom content');
      expect(content).toContain('# 项目配置');
    });
  });

  describe('output messages', () => {
    it('should show success message', () => {
      const result = runFlowmem('init');

      expect(result.stdout).toContain('初始化完成');
    });

    it('should show warning if already initialized', () => {
      runFlowmem('init');
      const result = runFlowmem('init');

      expect(result.stdout).toContain('已存在');
    });
  });
});
