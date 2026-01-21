// 数据库管理器

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCHEMA_SQL } from './schema.js';

export class DBManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(SCHEMA_SQL);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  getDB(): Database.Database {
    return this.db;
  }

  close() {
    this.db.close();
  }
}
