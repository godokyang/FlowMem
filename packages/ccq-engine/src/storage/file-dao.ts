// File DAO

import type { FileMeta } from '../core/types.js';

export class FileDAO {
  constructor(private db: Database.Database) {}

  upsert(file: FileMeta) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO files (path, mtime_ms, size, hash, indexed_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(file.path, file.mtimeMs, file.size, file.hash, file.indexedAt || new Date().toISOString());
  }

  getByPath(path: string): FileMeta | undefined {
    const row = this.db.prepare('SELECT * FROM files WHERE path = ?').get(path);
    if (!row) return undefined;
    return {
      path: row.path,
      mtimeMs: row.mtime_ms,
      size: row.size,
      hash: row.hash,
      indexedAt: row.indexed_at
    };
  }

  delete(path: string) {
    this.db.prepare('DELETE FROM files WHERE path = ?').run(path);
  }

  getAllPaths(): string[] {
    const rows = this.db.prepare('SELECT path FROM files').all() as { path: string }[];
    return rows.map(r => r.path);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number };
    return row.count;
  }
}
