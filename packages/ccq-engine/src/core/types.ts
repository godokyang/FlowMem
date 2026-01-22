// @ccq/engine - 核心类型定义

export interface Config {
  rootPath: string;
  dbPath: string;
  ignorePatterns: string[];
  languages: {
    tier1: string[];
    tier2: string[];
    tier3: string[];
  };
  mode: 'full_auto' | 'hybrid' | 'manual_only';
  hybrid: {
    projectMdEnabled: boolean;
    projectMdPath: string;
    autoInclude: boolean;
  };
  retrieval: {
    topK: number;
    rrfK: number;
    weights: {
      vector: number;
      bm25: number;
    };
  };
  embeddings?: {
    mode: 'offline' | 'online';
    offline?: { model: string };
    online?: { url?: string; headers?: Record<string, string>; batchSize?: number; normalize?: boolean };
  };
  chunker?: {
    astEnabled?: boolean;
    fallback?: { maxChars: number; overlap: number };
    maxChunkSize?: number;
  };
}

export interface Chunk {
  id: string;
  path: string;
  text: string;
  startLine: number;
  endLine: number;
  chunkType: 'code' | 'markdown' | 'text';
  symbolName?: string;
  tokens: number;
  hash: string;
}

export interface Vector {
  id: string;
  dim: number;
  vector: Float32Array;
}

export interface FileMeta {
  path: string;
  mtimeMs: number;
  size: number;
  hash: string;
  indexedAt?: string;
}

export interface IScanner {
  scan(root: string): Promise<string[]>;
}

export interface IIndexer {
  indexFiles(files: string[]): Promise<void>;
}

export interface IRetriever {
  query(q: string, options: RetrievalOptions): Promise<string>;
}

export interface IStorage {
  saveChunks(chunks: Chunk[]): Promise<void>;
  saveVectors(vectors: Vector[]): Promise<void>;
  getChunks(ids: string[]): Promise<Chunk[]>;
}

export interface RetrievalOptions {
  topK?: number;
  mode?: 'vector' | 'bm25' | 'hybrid';
  projectMdPath?: string;
}
