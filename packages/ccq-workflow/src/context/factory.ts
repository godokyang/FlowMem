/**
 * Context Retriever 工厂函数
 *
 * 根据环境动态创建检索器
 */

import { ContextRetriever, ContextQuery, ContextResult } from './types';
import { SimpleRetriever } from './simple-retriever';
import { CCQEngineRetriever } from './ccq-engine-retriever';

export class RetrieverFactory {
  private static instance: ContextRetriever | null = null;

  /**
   * 创建检索器
   */
  static async create(projectRoot: string): Promise<ContextRetriever> {
    if (this.instance) {
      return this.instance;
    }

    const ccqRetriever = new CCQEngineRetriever(projectRoot);
    const isAvailable = await ccqRetriever.isAvailable();

    if (isAvailable) {
      console.log('Using CCQ Engine for context retrieval');
      this.instance = ccqRetriever;
    } else {
      console.log('CCQ Engine not available, using Simple Retriever');
      this.instance = new SimpleRetriever(projectRoot);
    }

    return this.instance;
  }

  /**
   * 重置实例
   */
  static reset(): void {
    this.instance = null;
  }
}
