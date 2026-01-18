const { runCheck, runAllChecks } = require('../src/utils/checks');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

describe('checks', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `flowmem-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.agentmem'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('checkStructure', () => {
    test('.agentmem 存在时通过', async () => {
      const result = await runCheck('structure', testDir);
      expect(result.pass).toBe(true);
    });

    test('.agentmem 不存在时失败', async () => {
      await fs.remove(path.join(testDir, '.agentmem'));
      const result = await runCheck('structure', testDir);
      expect(result.pass).toBe(false);
    });
  });

  describe('checkSize', () => {
    test('project.md 不超过 300 行时通过', async () => {
      const content = Array(200).fill('line').join('\n');
      await fs.writeFile(path.join(testDir, '.agentmem', 'project.md'), content);
      const result = await runCheck('size', testDir);
      expect(result.pass).toBe(true);
      expect(result.details.lines).toBeLessThanOrEqual(300);
    });

    test('project.md 超过 300 行时失败', async () => {
      const content = Array(350).fill('line').join('\n');
      await fs.writeFile(path.join(testDir, '.agentmem', 'project.md'), content);
      const result = await runCheck('size', testDir);
      expect(result.pass).toBe(false);
      expect(result.details.lines).toBeGreaterThan(300);
    });
  });

  describe('checkTodo', () => {
    test('正确统计 todo 状态', async () => {
      const content = `
# Todolist
- [ ] Task 1
- [x] Task 2
- [/] Task 3
- [ ] Task 4
- [x] Task 5
`;
      await fs.writeFile(path.join(testDir, '.agentmem', 'todolist.md'), content);
      const result = await runCheck('todo', testDir);
      expect(result.pass).toBe(true);
      expect(result.details.total).toBe(5);
      expect(result.details.completed).toBe(2);
      expect(result.details.inProgress).toBe(1);
      expect(result.details.pending).toBe(2);
    });
  });

  describe('checkConfirmed', () => {
    test('包含"已确认"时通过', async () => {
      await fs.writeFile(
        path.join(testDir, '.agentmem', 'request.md'),
        '## 需求已确认\\n用户已批准'
      );
      const result = await runCheck('confirmed', testDir);
      expect(result.pass).toBe(true);
    });

    test('不包含确认标记时失败', async () => {
      await fs.writeFile(
        path.join(testDir, '.agentmem', 'request.md'),
        '## 需求澄清\\n待确认'
      );
      const result = await runCheck('confirmed', testDir);
      expect(result.pass).toBe(false);
    });
  });

  describe('runAllChecks', () => {
    test('运行所有检查项', async () => {
      await fs.writeFile(path.join(testDir, '.agentmem', 'project.md'), 'test');
      const results = await runAllChecks(testDir);
      
      expect(Object.keys(results)).toHaveLength(10);
      expect(results).toHaveProperty('debt');
      expect(results).toHaveProperty('structure');
      expect(results).toHaveProperty('size');
    });
  });
});
