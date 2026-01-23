/**
 * Context Retriever 接口
 *
 * 代码上下文检索抽象层
 */

import {
  ContextRetriever,
  ContextQuery,
  ContextResult
} from './types';

/**
 * Context Retriever 接口
 */
export abstract class BaseContextRetriever implements ContextRetriever {
  /**
   * 检索器名称
   */
  abstract readonly name: string;

  /**
   * 检索相关代码
   */
  abstract retrieve(query: ContextQuery): Promise<ContextResult>;

  /**
   * 是否可用
   */
  isAvailable(): boolean {
    return true;
  }
}
