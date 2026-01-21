const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('flowmem todo integration tests', () => {
  let testDir;
  let todoFile;
  
  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmem-test-'));
    const agentmemDir = path.join(testDir, '.agentmem');
    fs.mkdirSync(agentmemDir);
    
    todoFile = path.join(agentmemDir, 'todolist.md');
    
    const initialContent = `---
meta:
  title: "Integration Test"
  created: "2024-01-01T00:00:00Z"
  updated: "2024-01-01T00:00:00Z"
todos:
  - id: "TODO-001"
    content: "Test task 1"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: []
    phase: "Phase 1"
  - id: "TODO-002"
    content: "Test task 2"
    status: "completed"
    priority: "medium"
    estimate: "1h"
    dependencies: ["TODO-001"]
    phase: "Phase 1"
---
# Content`;
    
    fs.writeFileSync(todoFile, initialContent);
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });
  
  test('flowmem todo list should display tasks', () => {
    const output = execSync(`cd ${testDir} && flowmem todo list`, {
      encoding: 'utf-8'
    });
    
    expect(output).toContain('TODO-001');
    expect(output).toContain('TODO-002');
    expect(output).toContain('Test task 1');
  });
  
  test('flowmem todo stats should show progress', () => {
    const output = execSync(`cd ${testDir} && flowmem todo stats`, {
      encoding: 'utf-8'
    });
    
    expect(output).toContain('Integration Test');
    expect(output).toContain('总任务: 2');
    expect(output).toContain('已完成: 1');
    expect(output).toContain('50%');
  });
  
  test('flowmem audit dependency-check should validate', () => {
    const output = execSync(`cd ${testDir} && flowmem audit dependency-check`, {
      encoding: 'utf-8'
    });
    
    expect(output).toContain('dependency-check');
    expect(output).toContain('通过');
  });
  
  test('flowmem audit time-format should validate', () => {
    const output = execSync(`cd ${testDir} && flowmem audit time-format`, {
      encoding: 'utf-8'
    });
    
    expect(output).toContain('time-format');
    expect(output).toContain('通过');
  });
  
  test('should detect circular dependencies', () => {
    const circularContent = `---
meta:
  title: "Circular Test"
todos:
  - id: "TODO-001"
    content: "Task 1"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: ["TODO-002"]
    phase: "Phase 1"
  - id: "TODO-002"
    content: "Task 2"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: ["TODO-001"]
    phase: "Phase 1"
---
# Content`;
    
    fs.writeFileSync(todoFile, circularContent);
    
    try {
      execSync(`cd ${testDir} && flowmem audit dependency-check`, {
        encoding: 'utf-8'
      });
      fail('Should have detected circular dependency');
    } catch (err) {
      expect(err.stdout).toContain('循环依赖');
    }
  });
  
  test('should detect invalid time format', () => {
    const invalidTimeContent = `---
meta:
  title: "Invalid Time Test"
todos:
  - id: "TODO-001"
    content: "Task 1"
    status: "pending"
    priority: "high"
    estimate: "30 minutes"
    dependencies: []
    phase: "Phase 1"
---
# Content`;
    
    fs.writeFileSync(todoFile, invalidTimeContent);
    
    try {
      execSync(`cd ${testDir} && flowmem audit time-format`, {
        encoding: 'utf-8'
      });
      fail('Should have detected invalid time format');
    } catch (err) {
      expect(err.stdout).toContain('时间格式');
    }
  });
});
