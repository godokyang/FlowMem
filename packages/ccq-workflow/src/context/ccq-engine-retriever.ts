/**
 * CCQ Engine Retriever - 可选依赖
 *
 * 使用 @ccq/engine 进行代码上下文检索
 */

import { BaseContextRetriever } from './retriever';

export class CCQEngineRetriever extends BaseContextRetriever {
  readonly name = 'ccq-engine';

  private ccqEngine: any = null;
  private ccqEngineAvailable: boolean = false;

  constructor(private readonly projectRoot: string) {
    super();
  }

  async retrieve(query: import('./types').ContextQuery): Promise<import('./types').ContextResult> {
    if (!this.ccqEngineAvailable) {
      console.warn('@ccq/engine not available, falling back to simple retriever');
      return { chunks: [], tokensUsed: 0 };
    }

    try {
      const result = await this.ccqEngine.context({
        query: query.text,
        maxTokens: query.maxTokens || 4000,
        fileFilters: query.fileFilters
      });

      const chunks = result.chunks.map((c: any) => ({
        filePath: c.path,
        language: c.language,
        content: c.content,
        relevanceScore: c.score || 0.9
      }));

      return {
        chunks,
        tokensUsed: result.tokensUsed || 0
      };
    } catch (error) {
      console.error('CCQ Engine error:', error);
      return { chunks: [], tokensUsed: 0 };
    }
  }



  private async tryImportCCQEngine(): Promise<any> {
    try {
      return await import('@ccq/engine');
    } catch {
      return null;
    }
  }
}
