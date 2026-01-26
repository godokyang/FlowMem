/**
 * 文件工具函数测试
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AGENTMEM_DIR,
  getAgentmemPath,
  agentmemExists,
  ensureDir,
  readFile,
  writeFile,
  parseFrontmatter,
  generateFrontmatter,
  getTimestamp,
  generateId
} from '../src/utils/file';

describe('file utils', () => {
  let testDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmem-test-'));
  });

  afterEach(() => {
    // 清理测试目录
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('AGENTMEM_DIR', () => {
    it('should be .agentmem', () => {
      expect(AGENTMEM_DIR).toBe('.agentmem');
    });
  });

  describe('getAgentmemPath', () => {
    it('should return .agentmem path in given directory', () => {
      const result = getAgentmemPath(testDir);
      expect(result).toBe(path.join(testDir, '.agentmem'));
    });

    it('should use cwd when no directory provided', () => {
      const result = getAgentmemPath();
      expect(result).toBe(path.join(process.cwd(), '.agentmem'));
    });
  });

  describe('agentmemExists', () => {
    it('should return false when .agentmem does not exist', () => {
      expect(agentmemExists(testDir)).toBe(false);
    });

    it('should return true when .agentmem exists', () => {
      fs.mkdirSync(path.join(testDir, '.agentmem'));
      expect(agentmemExists(testDir)).toBe(true);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if not exists', () => {
      const dirPath = path.join(testDir, 'new', 'nested', 'dir');
      expect(fs.existsSync(dirPath)).toBe(false);

      ensureDir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      const dirPath = path.join(testDir, 'existing');
      fs.mkdirSync(dirPath);

      expect(() => ensureDir(dirPath)).not.toThrow();
    });
  });

  describe('readFile', () => {
    it('should return file content', () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'hello world');

      expect(readFile(filePath)).toBe('hello world');
    });

    it('should return null for non-existent file', () => {
      const filePath = path.join(testDir, 'nonexistent.txt');
      expect(readFile(filePath)).toBeNull();
    });
  });

  describe('writeFile', () => {
    it('should write content to file', () => {
      const filePath = path.join(testDir, 'output.txt');
      writeFile(filePath, 'test content');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('test content');
    });

    it('should create parent directories if needed', () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
      writeFile(filePath, 'nested content');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('nested content');
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse YAML frontmatter', () => {
      const content = `---
title: "Test"
count: 42
enabled: true
---

Body content here`;

      const result = parseFrontmatter<{ title: string; count: number; enabled: boolean }>(content);

      expect(result).not.toBeNull();
      expect(result!.frontmatter.title).toBe('Test');
      expect(result!.frontmatter.count).toBe(42);
      expect(result!.frontmatter.enabled).toBe(true);
      expect(result!.body.trim()).toBe('Body content here');
    });

    it('should return null for content without frontmatter', () => {
      const content = 'Just plain content';
      expect(parseFrontmatter(content)).toBeNull();
    });
  });

  describe('generateFrontmatter', () => {
    it('should generate YAML frontmatter', () => {
      const data = {
        title: 'Test',
        count: 42,
        enabled: true
      };

      const result = generateFrontmatter(data);

      expect(result).toContain('---');
      expect(result).toContain('title: "Test"');
      expect(result).toContain('count: 42');
      expect(result).toContain('enabled: true');
    });
  });

  describe('getTimestamp', () => {
    it('should return ISO 8601 timestamp', () => {
      const timestamp = getTimestamp();

      // 应该是有效的 ISO 日期
      expect(() => new Date(timestamp)).not.toThrow();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('TODO');
      const id2 = generateId('TODO');

      expect(id1).toMatch(/^TODO-/);
      expect(id2).toMatch(/^TODO-/);
      expect(id1).not.toBe(id2);
    });

    it('should use default prefix if not provided', () => {
      const id = generateId();
      expect(id).toMatch(/^ID-/);
    });
  });
});
