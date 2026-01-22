import fs from 'fs/promises';
import Database from 'better-sqlite3';

export class StateService {
  constructor(private db: Database.Database) {}

  async exportState(outputPath: string) {
    const state = {
      files: this.db.prepare('SELECT * FROM files').all(),
      chunks: this.db.prepare('SELECT * FROM chunks').all(),
      vectors: this.db.prepare('SELECT * FROM vectors').all(),
      index_meta: this.db.prepare('SELECT * FROM index_meta').all(),
      bm25_stats: this.db.prepare('SELECT * FROM bm25_stats').all(),
      bm25_postings: this.db.prepare('SELECT * FROM bm25_postings').all()
    };
    
    await fs.writeFile(outputPath, JSON.stringify(state, null, 2), 'utf-8');
  }

  async importState(inputPath: string) {
    const content = await fs.readFile(inputPath, 'utf-8');
    const state = JSON.parse(content);

    const tables = ['files', 'chunks', 'vectors', 'index_meta', 'bm25_stats', 'bm25_postings'];
    
    this.db.transaction(() => {
      for (const table of tables) {
        this.db.prepare(`DELETE FROM ${table}`).run();
      }

      for (const table of tables) {
        if (!state[table] || state[table].length === 0) continue;
        
        const rows = state[table];
        const keys = Object.keys(rows[0]);
        const placeholders = keys.map(() => '?').join(',');
        const stmt = this.db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`);
        
        for (const row of rows) {
          stmt.run(...keys.map(k => row[k]));
        }
      }
    })();
  }
}
