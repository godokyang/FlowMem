const { detectAdapter } = require('../src/utils/detect-adapter');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('detectAdapter', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `flowmem-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  test('检测 Cursor 适配器（.cursor 目录）', async () => {
    await fs.ensureDir(path.join(testDir, '.cursor'));
    expect(detectAdapter(testDir)).toBe('cursor');
  });

  test('检测 Cursor 适配器（.cursorrules 文件）', async () => {
    await fs.writeFile(path.join(testDir, '.cursorrules'), '');
    expect(detectAdapter(testDir)).toBe('cursor');
  });

  test('检测 Claude Code 适配器', async () => {
    await fs.ensureDir(path.join(testDir, '.claude'));
    expect(detectAdapter(testDir)).toBe('claude-code');
  });

  test('检测 Windsurf 适配器', async () => {
    await fs.ensureDir(path.join(testDir, '.windsurf'));
    expect(detectAdapter(testDir)).toBe('windsurf');
  });

  test('检测 Copilot 适配器', async () => {
    await fs.ensureDir(path.join(testDir, '.github'));
    await fs.writeFile(path.join(testDir, '.github', 'copilot-instructions.md'), '');
    expect(detectAdapter(testDir)).toBe('copilot');
  });

  test('检测 Cline 适配器', async () => {
    await fs.ensureDir(path.join(testDir, '.cline'));
    expect(detectAdapter(testDir)).toBe('cline');
  });

  test('检测 Trae 适配器', async () => {
    await fs.ensureDir(path.join(testDir, '.trae'));
    expect(detectAdapter(testDir)).toBe('trae');
  });

  test('默认返回 claude-code（未检测到任何标记）', () => {
    expect(detectAdapter(testDir)).toBe('claude-code');
  });

  test('优先级：第一个匹配的标记优先', async () => {
    await fs.ensureDir(path.join(testDir, '.cursor'));
    await fs.ensureDir(path.join(testDir, '.claude'));
    expect(detectAdapter(testDir)).toBe('cursor');
  });
});
