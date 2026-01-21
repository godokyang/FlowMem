const { copyDirectory, copyFile, ensureDir } = require('../src/utils/file-ops');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('file-ops', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `flowmem-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('ensureDir', () => {
    test('创建目录', async () => {
      const dirPath = path.join(testDir, 'newdir');
      await ensureDir(dirPath);
      expect(fs.existsSync(dirPath)).toBe(true);
    });

    test('目录已存在时不报错', async () => {
      const dirPath = path.join(testDir, 'existingdir');
      await fs.ensureDir(dirPath);
      await expect(ensureDir(dirPath)).resolves.not.toThrow();
    });
  });

  describe('copyFile', () => {
    test('复制文件成功', async () => {
      const srcFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      
      await fs.writeFile(srcFile, 'test content');
      await copyFile(srcFile, destFile);
      
      expect(fs.existsSync(destFile)).toBe(true);
      const content = await fs.readFile(destFile, 'utf-8');
      expect(content).toBe('test content');
    });

    test('目标文件存在且不使用 force 时抛出错误', async () => {
      const srcFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      
      await fs.writeFile(srcFile, 'source');
      await fs.writeFile(destFile, 'existing');
      
      await expect(copyFile(srcFile, destFile)).rejects.toThrow();
    });

    test('使用 force 选项覆盖文件', async () => {
      const srcFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      
      await fs.writeFile(srcFile, 'new content');
      await fs.writeFile(destFile, 'old content');
      
      await copyFile(srcFile, destFile, { force: true });
      
      const content = await fs.readFile(destFile, 'utf-8');
      expect(content).toBe('new content');
    });
  });

  describe('copyDirectory', () => {
    test('复制目录及其内容', async () => {
      const srcDir = path.join(testDir, 'srcdir');
      const destDir = path.join(testDir, 'destdir');
      
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(srcDir, 'file2.txt'), 'content2');
      
      await copyDirectory(srcDir, destDir);
      
      expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'file2.txt'))).toBe(true);
    });

    test('目标目录存在且不使用 force 时抛出错误', async () => {
      const srcDir = path.join(testDir, 'srcdir');
      const destDir = path.join(testDir, 'destdir');
      
      await fs.ensureDir(srcDir);
      await fs.ensureDir(destDir);
      
      await expect(copyDirectory(srcDir, destDir)).rejects.toThrow();
    });
  });
});
