import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { DBManager } from './storage/db.js';
import { FileDAO } from './storage/file-dao.js';
import { ChunkDAO } from './storage/chunk-dao.js';
import { VectorDAO } from './storage/vector-dao.js';
import { MetaDAO } from './storage/meta-dao.js';
import { StateService } from './core/state-service.js';
import { IgnoreManager } from './indexer/ignore-manager.js';
import { FileScanner } from './indexer/scanner.js';
import { ParserFactory } from './indexer/parser-factory.js';
import { ASTChunker } from './indexer/chunkers/ast-chunker.js';
import { LineChunker } from './indexer/chunkers/line-chunker.js';
import { SymbolIndex } from './indexer/symbol-index.js';
import { OfflineProvider } from './embeddings/offline-provider.js';
import { OpenAIProvider } from './embeddings/openai-provider.js';
import { BM25Index } from './retrieval/bm25.js';
import { VectorSearcher } from './retrieval/vector-searcher.js';
import { rrf } from './retrieval/rrf.js';
import { ContextPacker } from './retrieval/context-packer.js';
import { Reranker } from './retrieval/reranker.js';
import { OpenAIClient } from './llm/openai-client.js';
import { computeHashSHA256 } from './utils/hash.js';
import { logger } from './core/logger.js';
import { setupGlobalHandlers } from './core/error-handler.js';
import type { Config, Chunk, Vector, FileMeta } from './core/types.js';
import type { LLMClient } from './llm/types.js';

export class ContextEngine {
  private dbManager!: DBManager;
  private fileDAO!: FileDAO;
  private chunkDAO!: ChunkDAO;
  private vectorDAO!: VectorDAO;
  private metaDAO!: MetaDAO;
  private stateService!: StateService;
  private bm25Index!: BM25Index;
  private symbolIndex!: SymbolIndex;
  private ignoreManager!: IgnoreManager;
  private fileScanner!: FileScanner;
  private astChunker!: ASTChunker;
  private lineChunker!: LineChunker;
  private embeddingsProvider!: OfflineProvider | OpenAIProvider;
  private vectorSearcher!: VectorSearcher;
  private contextPacker!: ContextPacker;
  private llmClient!: LLMClient;

  constructor(private config: Config) {
    setupGlobalHandlers();
    
    if (config.dbPath) {
      logger.init(path.join(path.dirname(config.dbPath), 'ccq.log'));
    }
    
    this.init();
  }

  private async init() {
    try {
      this.dbManager = new DBManager(this.config.dbPath);
      const db = this.dbManager.getDB();
      this.fileDAO = new FileDAO(db);
      this.chunkDAO = new ChunkDAO(db);
      this.vectorDAO = new VectorDAO(db);
      this.metaDAO = new MetaDAO(db);
      this.stateService = new StateService(db);
      this.bm25Index = new BM25Index(db);
      this.symbolIndex = new SymbolIndex(db);

      this.ignoreManager = new IgnoreManager();
      await this.ignoreManager.loadRules(this.config.rootPath);
      this.fileScanner = new FileScanner(this.ignoreManager);
      await ParserFactory.init();
      this.astChunker = new ASTChunker();
      this.lineChunker = new LineChunker();
      this.vectorSearcher = new VectorSearcher();
      this.contextPacker = new ContextPacker();

      if (this.config.embeddings?.mode === 'online') {
        this.embeddingsProvider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY || ''
        });
      } else {
        this.embeddingsProvider = new OfflineProvider();
        await (this.embeddingsProvider as OfflineProvider).init();
      }

      this.llmClient = new OpenAIClient({
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      });
    } catch (error) {
      logger.error('Failed to initialize ContextEngine:', error);
      throw error;
    }
  }

  async index(options: { full?: boolean; watch?: boolean } = {}) {
    logger.info('Starting indexing...', options);
    
    if (!this.dbManager) await this.init();

    this.metaDAO.set('status', 'indexing');
    this.metaDAO.set('indexing_started_at', new Date().toISOString());

    const files = await this.fileScanner.scan(this.config.rootPath);
    logger.info(`Found ${files.length} files to process`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const relPath of files) {
      const fullPath = path.join(this.config.rootPath, relPath);
      const processed = await this.indexFile(fullPath, relPath, options.full);
      if (processed) processedCount++;
      else skippedCount++;
    }

    this.metaDAO.set('status', 'ready');
    this.metaDAO.set('last_indexed', new Date().toISOString());
    logger.info(`Indexing complete. Processed: ${processedCount}, Skipped: ${skippedCount}`);

    if (options.watch) {
      this.startWatcher();
    }
  }

  private async indexFile(fullPath: string, relPath: string, force = false): Promise<boolean> {
    try {
      const currentHash = await computeHashSHA256(fullPath);
      const stat = await fs.stat(fullPath);
      const existingFile = this.fileDAO.getByPath(relPath);

      if (!force && existingFile && existingFile.hash === currentHash) {
        return false;
      }

      logger.debug(`Indexing: ${relPath}`);

      if (existingFile) {
        this.chunkDAO.deleteByPath(relPath);
        this.vectorDAO.deleteByPath(relPath);
        this.bm25Index.removeByPath(relPath);
      }

      const content = await fs.readFile(fullPath, 'utf-8');

      let chunks: Chunk[] = [];
      try {
        if (this.config.chunker?.astEnabled !== false) {
          chunks = await this.astChunker.chunk(content, relPath);
        } else {
          chunks = await this.lineChunker.chunk(content, relPath);
        }
      } catch (e) {
        logger.warn(`AST chunking failed for ${relPath}, falling back to line chunker`, e);
        chunks = await this.lineChunker.chunk(content, relPath);
      }

      if (chunks.length === 0) return true;

      const texts = chunks.map(c => c.text);
      let vectors: number[][] = [];
      try {
        vectors = await this.embeddingsProvider.embed(texts);
      } catch (e) {
        logger.error(`Embedding failed for ${relPath}:`, e);
        return false;
      }

      this.dbManager.transaction(() => {
        this.chunkDAO.saveMany(chunks);
        
        const vectorRecords: Vector[] = chunks.map((chunk, i) => ({
          id: chunk.id,
          dim: vectors[i].length,
          vector: new Float32Array(vectors[i])
        }));
        this.vectorDAO.saveMany(vectorRecords);

        for (const chunk of chunks) {
          this.bm25Index.add(chunk.id, chunk.text);
          if (chunk.symbolName) {
            this.symbolIndex.add(chunk.symbolName, relPath, chunk.startLine, chunk.chunkType);
          }
        }

        const fileMeta: FileMeta = {
          path: relPath,
          hash: currentHash,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          indexedAt: new Date().toISOString()
        };
        this.fileDAO.upsert(fileMeta);
      });

      return true;
    } catch (error) {
      logger.error(`Error indexing file ${relPath}:`, error);
      return false;
    }
  }

  private startWatcher() {
    logger.info('Starting watch mode...');
    const watcher = chokidar.watch(this.config.rootPath, {
      ignored: (path) => this.ignoreManager.ignores(path),
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('add', (filePath) => this.handleFileChange(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileRemove(filePath));
  }

  private async handleFileChange(filePath: string) {
    const relPath = path.relative(this.config.rootPath, filePath);
    if (this.ignoreManager.ignores(relPath)) return;
    
    logger.info(`File changed: ${relPath}`);
    await this.indexFile(filePath, relPath, true);
  }

  private async handleFileRemove(filePath: string) {
    const relPath = path.relative(this.config.rootPath, filePath);
    logger.info(`File removed: ${relPath}`);
    
    this.dbManager.transaction(() => {
      this.fileDAO.delete(relPath);
      this.chunkDAO.deleteByPath(relPath);
      this.vectorDAO.deleteByPath(relPath);
      this.bm25Index.removeByPath(relPath);
    });
  }

  async addRemoteFile(url: string) {
    if (!this.dbManager) await this.init();

    try {
      logger.info(`Fetching remote file: ${url}`);
      // @ts-ignore
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      const content = await response.text();

      const fileName = path.basename(new URL(url).pathname) || 'index.html';
      const importDir = path.join(this.config.rootPath, '.ccq/imports');
      await fs.mkdir(importDir, { recursive: true });
      
      const filePath = path.join(importDir, fileName);
      await fs.writeFile(filePath, content, 'utf-8');
      
      const relPath = path.relative(this.config.rootPath, filePath);
      await this.indexFile(filePath, relPath, true);
      
      logger.info(`Remote file indexed: ${relPath}`);
    } catch (error) {
      logger.error(`Error adding remote file:`, error);
    }
  }

  async retrieve(query: string, options: any = {}) {
    if (!this.dbManager) await this.init();

    const topK = options.topK || this.config.retrieval.topK || 10;
    
    let queryVector: number[] = [];
    try {
      const embeddings = await this.embeddingsProvider.embed([query]);
      queryVector = embeddings[0];
    } catch (e) {
      logger.error('Failed to embed query:', e);
      return '';
    }

    const allVectors = this.vectorDAO.getAll();
    this.vectorSearcher.loadVectors(allVectors);
    const vectorResults = this.vectorSearcher.search(new Float32Array(queryVector), topK * 2);

    const bm25Results = this.bm25Index.search(query, topK * 2);

    const fusedResults = rrf(bm25Results, vectorResults, this.config.retrieval.rrfK);
    const topResults = fusedResults.slice(0, topK * 2);

    const chunkIds = topResults.map(r => r.docId);
    let chunks = this.chunkDAO.getChunks(chunkIds);

    chunks = Reranker.rerank(chunks, query).slice(0, topK);

    return this.contextPacker.pack(chunks);
  }

  async ask(question: string, options: any = {}) {
    const context = await this.retrieve(question, options);
    
    const systemPrompt = `You are a helpful coding assistant. Use the following context to answer the user's question.
If the answer is not in the context, say so.

Context:
${context}`;

    return await this.llmClient.complete(question, systemPrompt);
  }

  async getStatus() {
    if (!this.dbManager) await this.init();
    
    const meta = this.metaDAO.getAll();
    
    return {
      status: meta.status || 'unknown',
      files: this.fileDAO.count(),
      chunks: this.chunkDAO.count(),
      vectors: this.vectorDAO.count(),
      lastIndexed: meta.last_indexed || null
    };
  }

  async exportState(outputPath: string) {
    if (!this.dbManager) await this.init();
    await this.stateService.exportState(outputPath);
  }

  async importState(inputPath: string) {
    if (!this.dbManager) await this.init();
    await this.stateService.importState(inputPath);
  }

  async installGitHooks() {
    const gitDir = path.join(this.config.rootPath, '.git');
    try {
      await fs.access(gitDir);
    } catch {
      logger.error('Not a git repository');
      return;
    }

    const hooksDir = path.join(gitDir, 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });

    const hookContent = `#!/bin/sh
# FlowMem CCQ Hook
npx ccq index > /dev/null 2>&1 &
`;

    const hooks = ['post-checkout', 'post-merge'];
    for (const hook of hooks) {
      const hookPath = path.join(hooksDir, hook);
      await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
      logger.info(`Installed ${hook} hook`);
    }
  }
}
