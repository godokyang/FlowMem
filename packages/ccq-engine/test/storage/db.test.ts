import { DBManager } from '../src/storage/db.js';

describe('DBManager', () => {
  test('should initialize schema', () => {
    const db = new DBManager(':memory:');
    const tables = db.getDB().prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);
    
    expect(tableNames).toContain('files');
    expect(tableNames).toContain('chunks');
    expect(tableNames).toContain('vectors');
    
    db.close();
  });
});
