// Symbol Indexing - 符号索引

import Database from 'better-sqlite3';

export class SymbolIndex {
  constructor(private db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS symbols (
        name TEXT,
        path TEXT,
        line INTEGER,
        kind TEXT,
        PRIMARY KEY (name, path, line)
      );
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
    `);
  }

  add(name: string, path: string, line: number, kind: string) {
    this.db.prepare('INSERT OR IGNORE INTO symbols (name, path, line, kind) VALUES (?, ?, ?, ?)').run(name, path, line, kind);
  }

  search(name: string): { path: string; line: number; kind: string }[] {
    return this.db.prepare('SELECT path, line, kind FROM symbols WHERE name = ?').all(name) as any[];
  }
  
  clear() {
    this.db.prepare('DELETE FROM symbols').run();
  }
}
