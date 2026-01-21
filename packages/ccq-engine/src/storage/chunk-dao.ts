// Chunk DAO

import type { Chunk } from '../core/types.js';

export class ChunkDAO {
  constructor(private db: Database.Database) {}

  saveMany(chunks: Chunk[]) {
    const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, path, idx, text, start_line, end_line, chunk_type, symbol_name, chunk_hash, tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((chunks: Chunk[]) => {
      for (const chunk of chunks) {
        insertChunk.run(
          chunk.id,
          chunk.path,
          parseInt(chunk.id.split(':')[1] || '0'),
          chunk.text,
          chunk.startLine,
          chunk.endLine,
          chunk.chunkType,
          chunk.symbolName || null,
          chunk.hash,
          chunk.tokens
        );
      }
    });

    insertMany(chunks);
  }

  deleteByPath(path: string) {
    this.db.prepare('DELETE FROM chunks WHERE path = ?').run(path);
  }

  getById(id: string): Chunk | undefined {
    const row = this.db.prepare('SELECT * FROM chunks WHERE id = ?').get(id);
    if (!row) return undefined;
    return {
      id: row.id,
      path: row.path,
      text: row.text,
      startLine: row.start_line,
      endLine: row.end_line,
      chunkType: row.chunk_type,
      symbolName: row.symbol_name,
      tokens: row.tokens,
      hash: row.chunk_hash
    };
  }

  getLanguageStats() { path: string; files: number; chunks: number }[] {
    const rows = this.db.prepare(`
      SELECT 
        path,
        COUNT(DISTINCT path) as files,
        COUNT(*) as chunks
      FROM chunks
      GROUP BY path
      ORDER BY chunks DESC
    `).all() as any[];
    return rows.map(r => ({
      path: r.path,
      files: r.files,
      chunks: r.chunks
    }));
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
    return row.count;
  }
}
