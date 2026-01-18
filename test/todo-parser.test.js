const fs = require('fs-extra');
const path = require('path');
const {
  parseTodoList,
  calculateStats,
  calculateTotalTime,
  generateProgressBar,
  validateDependencies,
  detectCircularDependencies,
  validateTimeFormat,
  updateTodoList
} = require('../src/utils/todo-parser');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

beforeAll(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR);
  }
});

afterAll(() => {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.removeSync(FIXTURES_DIR);
  }
});

describe('parseTodoList', () => {
  test('should parse YAML Frontmatter format', () => {
    const content = `---
meta:
  title: "Test Task"
todos:
  - id: "TODO-001"
    content: "Task 1"
    status: "pending"
    priority: "high"
    estimate: "30m"
    dependencies: []
    phase: "Phase 1"
---
# Content`;
    
    const filePath = path.join(FIXTURES_DIR, 'test-yaml.md');
    fs.writeFileSync(filePath, content);
    
    const result = parseTodoList(filePath);
    
    expect(result.format).toBe('yaml');
    expect(result.meta.title).toBe('Test Task');
    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].id).toBe('TODO-001');
    expect(result.todos[0].status).toBe('pending');
  });
  
  test('should parse legacy format', () => {
    const content = `# Task List
- [ ] **TODO-001**: Task 1
- [x] **TODO-002**: Task 2`;
    
    const filePath = path.join(FIXTURES_DIR, 'test-legacy.md');
    fs.writeFileSync(filePath, content);
    
    const result = parseTodoList(filePath);
    
    expect(result.format).toBe('legacy');
    expect(result.todos).toHaveLength(2);
    expect(result.todos[0].status).toBe('pending');
    expect(result.todos[1].status).toBe('completed');
  });
  
  test('should throw error for non-existent file', () => {
    expect(() => {
      parseTodoList('/non/existent/file.md');
    }).toThrow('TodoList 文件不存在');
  });
});

describe('calculateStats', () => {
  test('should calculate correct stats', () => {
    const todos = [
      { status: 'pending' },
      { status: 'in_progress' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'cancelled' }
    ];
    
    const stats = calculateStats(todos);
    
    expect(stats.total).toBe(5);
    expect(stats.pending).toBe(1);
    expect(stats.inProgress).toBe(1);
    expect(stats.completed).toBe(2);
    expect(stats.cancelled).toBe(1);
  });
  
  test('should handle empty array', () => {
    const stats = calculateStats([]);
    
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
  });
});

describe('calculateTotalTime', () => {
  test('should calculate time in minutes', () => {
    const todos = [
      { estimate: '5m' },
      { estimate: '30m' }
    ];
    
    expect(calculateTotalTime(todos)).toBe('35m');
  });
  
  test('should calculate time in hours', () => {
    const todos = [
      { estimate: '1h' },
      { estimate: '2h' }
    ];
    
    expect(calculateTotalTime(todos)).toBe('3h');
  });
  
  test('should calculate mixed time formats', () => {
    const todos = [
      { estimate: '30m' },
      { estimate: '1h' },
      { estimate: '1d' }
    ];
    
    expect(calculateTotalTime(todos)).toBe('1d 1h 30m');
  });
  
  test('should handle empty estimates', () => {
    const todos = [
      { estimate: '' },
      { estimate: '1h' }
    ];
    
    expect(calculateTotalTime(todos)).toBe('1h');
  });
});

describe('generateProgressBar', () => {
  test('should generate correct progress bar', () => {
    const stats = { total: 10, completed: 5 };
    const bar = generateProgressBar(stats, 10);
    
    expect(bar).toContain('50%');
    expect(bar).toContain('█');
    expect(bar).toContain('░');
  });
  
  test('should handle 0 total', () => {
    const stats = { total: 0, completed: 0 };
    const bar = generateProgressBar(stats, 10);
    
    expect(bar).toContain('0%');
    expect(bar).toContain('░░░░░░░░░░');
  });
  
  test('should handle 100% completion', () => {
    const stats = { total: 10, completed: 10 };
    const bar = generateProgressBar(stats, 10);
    
    expect(bar).toContain('100%');
    expect(bar).toContain('██████████');
  });
});

describe('validateDependencies', () => {
  test('should validate existing dependencies', () => {
    const todos = [
      { id: 'TODO-001', dependencies: [] },
      { id: 'TODO-002', dependencies: ['TODO-001'] }
    ];
    
    const result = validateDependencies(todos);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('should detect missing dependencies', () => {
    const todos = [
      { id: 'TODO-001', dependencies: ['TODO-999'] }
    ];
    
    const result = validateDependencies(todos);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('missing_dependency');
  });
});

describe('detectCircularDependencies', () => {
  test('should detect simple circular dependency', () => {
    const todos = [
      { id: 'TODO-001', dependencies: ['TODO-002'] },
      { id: 'TODO-002', dependencies: ['TODO-001'] }
    ];
    
    const result = detectCircularDependencies(todos);
    
    expect(result.hasCircular).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
  });
  
  test('should detect complex circular dependency', () => {
    const todos = [
      { id: 'TODO-001', dependencies: ['TODO-002'] },
      { id: 'TODO-002', dependencies: ['TODO-003'] },
      { id: 'TODO-003', dependencies: ['TODO-001'] }
    ];
    
    const result = detectCircularDependencies(todos);
    
    expect(result.hasCircular).toBe(true);
  });
  
  test('should not detect false circular', () => {
    const todos = [
      { id: 'TODO-001', dependencies: [] },
      { id: 'TODO-002', dependencies: ['TODO-001'] },
      { id: 'TODO-003', dependencies: ['TODO-002'] }
    ];
    
    const result = detectCircularDependencies(todos);
    
    expect(result.hasCircular).toBe(false);
    expect(result.cycles).toHaveLength(0);
  });
});

describe('validateTimeFormat', () => {
  test('should validate correct formats', () => {
    expect(validateTimeFormat('5m')).toBe(true);
    expect(validateTimeFormat('30m')).toBe(true);
    expect(validateTimeFormat('1h')).toBe(true);
    expect(validateTimeFormat('2h')).toBe(true);
    expect(validateTimeFormat('1d')).toBe(true);
  });
  
  test('should reject invalid formats', () => {
    expect(validateTimeFormat('5 minutes')).toBe(false);
    expect(validateTimeFormat('1hour')).toBe(false);
    expect(validateTimeFormat('2 days')).toBe(false);
    expect(validateTimeFormat('abc')).toBe(false);
  });
  
  test('should allow empty string', () => {
    expect(validateTimeFormat('')).toBe(true);
  });
});

describe('updateTodoList', () => {
  test('should update todolist file with progress bar', () => {
    const filePath = path.join(FIXTURES_DIR, 'update-test.md');
    const data = {
      meta: {
        title: 'Test Update',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      },
      todos: [
        {
          id: 'TODO-001',
          content: 'Task 1',
          status: 'completed',
          priority: 'high',
          estimate: '30m',
          dependencies: [],
          phase: 'Phase 1'
        },
        {
          id: 'TODO-002',
          content: 'Task 2',
          status: 'pending',
          priority: 'medium',
          estimate: '1h',
          dependencies: ['TODO-001'],
          phase: 'Phase 1'
        }
      ]
    };
    
    updateTodoList(filePath, data);
    
    expect(fs.existsSync(filePath)).toBe(true);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('TODO-001');
    expect(content).toContain('TODO-002');
    expect(content).toContain('50%');
    expect(content).toContain('预计总时间');
  });
});
