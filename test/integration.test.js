const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const execAsync = promisify(exec);

describe('init command integration', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `flowmem-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  test('init 命令创建必要的文件和目录', async () => {
    const { stdout } = await execAsync(`cd ${testDir} && flowmem init --adapter cursor`);
    
    expect(stdout).toContain('FlowMem 初始化');
    expect(stdout).toContain('安装完成');
    
    expect(fs.existsSync(path.join(testDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.flowmem'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.agentmem', 'project.md'))).toBe(true);
  }, 15000);

  test('init 命令 --force 覆盖现有文件', async () => {
    await fs.writeFile(path.join(testDir, 'test.txt'), 'existing');
    
    await execAsync(`cd ${testDir} && flowmem init --adapter cursor`);
    await execAsync(`cd ${testDir} && flowmem init --adapter windsurf --force`);
    
    expect(fs.existsSync(path.join(testDir, '.windsurfrules'))).toBe(true);
  }, 15000);
});

describe('audit command integration', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `flowmem-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    await execAsync(`cd ${testDir} && flowmem init --adapter cursor`);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  test('audit 命令运行所有检查', async () => {
    const { stdout } = await execAsync(`cd ${testDir} && flowmem audit`);
    
    expect(stdout).toContain('FlowMem 审核报告');
    expect(stdout).toContain('总计');
  }, 15000);

  test('audit 命令单项检查', async () => {
    const { stdout } = await execAsync(`cd ${testDir} && flowmem audit structure`);
    
    expect(stdout).toContain('结构完整性');
  }, 15000);

  test('audit 命令 JSON 输出', async () => {
    const { stdout } = await execAsync(`cd ${testDir} && flowmem audit structure --json`);
    
    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('structure');
    expect(result.structure).toHaveProperty('pass');
  }, 15000);
});
