import Database from 'better-sqlite3';

export class MetaDAO {
  constructor(private db: Database.Database) {}

  set(key: string, value: string) {
    this.db.prepare('INSERT OR REPLACE INTO index_meta (key, value) VALUES (?, ?)').run(key, value);
  }

  get(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM index_meta WHERE key = ?').get(key) as { value: string };
    return row?.value;
  }

  getAll(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM index_meta').all() as { key: string, value: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }
}
