// BM25 索引实现 (SQLite backed)

import Database from 'better-sqlite3';
import { codeTokenize } from './code-tokenizer.js';

export class BM25Index {
  private k1 = 1.5;
  private b = 0.75;

  constructor(private db: Database.Database) {}

  add(docId: string, text: string) {
    const tokens = this.tokenize(text);
    const docLength = tokens.length;
    
    this.db.prepare('INSERT OR REPLACE INTO bm25_stats (doc_id, doc_length) VALUES (?, ?)').run(docId, docLength);

    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    const insertPosting = this.db.prepare('INSERT OR REPLACE INTO bm25_postings (term, doc_id, term_freq) VALUES (?, ?, ?)');
    
    const insertMany = this.db.transaction(() => {
      for (const [term, freq] of termFreq) {
        insertPosting.run(term, docId, freq);
      }
    });
    insertMany();
  }

  remove(docId: string) {
    this.db.prepare('DELETE FROM bm25_postings WHERE doc_id = ?').run(docId);
    this.db.prepare('DELETE FROM bm25_stats WHERE doc_id = ?').run(docId);
  }

  removeByPath(path: string) {
    const rows = this.db.prepare('SELECT doc_id FROM bm25_stats WHERE doc_id LIKE ?').all(`${path}:%`) as { doc_id: string }[];
    const deletePosting = this.db.prepare('DELETE FROM bm25_postings WHERE doc_id = ?');
    const deleteStat = this.db.prepare('DELETE FROM bm25_stats WHERE doc_id = ?');

    const deleteMany = this.db.transaction(() => {
      for (const row of rows) {
        deletePosting.run(row.doc_id);
        deleteStat.run(row.doc_id);
      }
    });
    deleteMany();
  }

  search(query: string, topK: number = 10): { docId: string; score: number }[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const statsRow = this.db.prepare('SELECT COUNT(*) as count, AVG(doc_length) as avgLen FROM bm25_stats').get() as { count: number, avgLen: number };
    const N = statsRow.count;
    const avgLen = statsRow.avgLen || 1;

    const scores = new Map<string, number>();

    for (const term of queryTokens) {
      const dfRow = this.db.prepare('SELECT COUNT(*) as df FROM bm25_postings WHERE term = ?').get(term) as { df: number };
      const n = dfRow.df;
      if (n === 0) continue;

      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);

      const postings = this.db.prepare(`
        SELECT p.doc_id, p.term_freq, s.doc_length 
        FROM bm25_postings p
        JOIN bm25_stats s ON p.doc_id = s.doc_id
        WHERE p.term = ?
      `).all(term) as { doc_id: string, term_freq: number, doc_length: number }[];

      for (const posting of postings) {
        const tf = posting.term_freq;
        const docLen = posting.doc_length;
        const normTF = (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * (docLen / avgLen)));
        const score = idf * normTF;
        
        scores.set(posting.doc_id, (scores.get(posting.doc_id) || 0) + score);
      }
    }

    return Array.from(scores.entries())
      .map(([docId, score]) => ({ docId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private tokenize(text: string): string[] {
    return codeTokenize(text);
  }
}
