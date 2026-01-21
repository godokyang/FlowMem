// SQLite Schema

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  mtime_ms INTEGER,
  size INTEGER,
  hash TEXT,
  indexed_at TEXT
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  path TEXT,
  idx INTEGER,
  text TEXT,
  start_line INTEGER,
  end_line INTEGER,
  chunk_type TEXT,
  symbol_name TEXT,
  chunk_hash TEXT,
  tokens INTEGER
);

CREATE TABLE IF NOT EXISTS vectors (
  id TEXT PRIMARY KEY,
  dim INTEGER,
  b64 TEXT
);

CREATE TABLE IF NOT EXISTS index_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS bm25_postings (
  term TEXT,
  doc_id TEXT,
  term_freq INTEGER,
  PRIMARY KEY (term, doc_id)
);

CREATE TABLE IF NOT EXISTS bm25_stats (
  doc_id TEXT PRIMARY KEY,
  doc_length INTEGER
);

CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_bm25_term ON bm25_postings(term);
`;
