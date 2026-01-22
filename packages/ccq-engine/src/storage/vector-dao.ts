// Vector DAO

import type { Vector } from '../core/types.js';
import Database from 'better-sqlite3';

function toBase64(f32: Float32Array): string {
  return Buffer.from(f32.buffer).toString('base64');
}

function fromBase64(str: string): Float32Array {
  const buf = Buffer.from(str, 'base64');
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

export class VectorDAO {
  constructor(private db: Database.Database) {}

  saveMany(vectors: Vector[]) {
    const insertVector = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, dim, b64)
      VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction((vectors: Vector[]) => {
      for (const vector of vectors) {
        insertVector.run(
          vector.id,
          vector.dim,
          toBase64(vector.vector)
        );
      }
    });

    insertMany(vectors);
  }

  getById(id: string): Vector | undefined {
    const row = this.db.prepare('SELECT * FROM vectors WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      dim: row.dim,
      vector: fromBase64(row.b64)
    };
  }

  getAll(): Vector[] {
    const rows = this.db.prepare('SELECT * FROM vectors').all() as any[];
    return rows.map((row: any) => ({
      id: row.id,
      dim: row.dim,
      vector: fromBase64(row.b64)
    }));
  }

  deleteByPath(path: string) {
    this.db.prepare('DELETE FROM vectors WHERE id LIKE ?').run(`${path}:%`);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM vectors').get() as { count: number };
    return row.count;
  }
}
