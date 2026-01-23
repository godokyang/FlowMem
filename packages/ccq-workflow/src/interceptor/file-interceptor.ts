/**
 * 写入拦截器实现
 *
 * 负责拦截对受保护文件的写入请求
 */

import {
  WriteRequest,
  InterceptResult,
  ProtectedFileConfig,
  ProtectedFileError,
  HighRiskOperationError
} from './types';
import * as path from 'path';
import { minimatch } from 'minimatch';

export class FileInterceptor {
  constructor(private config: ProtectedFileConfig) {}

  /**
   * 检查写入请求
   */
  async checkWrite(request: WriteRequest): Promise<InterceptResult> {
    const { filePath } = request;

    // 1. 检查精确路径匹配
    if (this.config.paths.includes(filePath)) {
      return {
        allowed: false,
        reason: `文件 '${filePath}' 在受保护列表中，禁止修改。`,
        riskLevel: 'high'
      };
    }

    // 2. 检查 Glob 模式匹配
    for (const pattern of this.config.patterns) {
      if (minimatch(filePath, pattern)) {
        return {
          allowed: false,
          reason: `文件 '${filePath}' 匹配受保护模式 '${pattern}'，禁止修改。`,
          riskLevel: 'high'
        };
      }
    }

    // 3. 检查高风险路径
    for (const highRiskPath of this.config.highRiskPaths) {
      if (filePath === highRiskPath || minimatch(filePath, highRiskPath)) {
        return {
          allowed: true,
          requiresConfirmation: true,
          reason: `修改 '${filePath}' 属于高风险操作，需要确认。`,
          riskLevel: 'high'
        };
      }
    }

    return {
      allowed: true,
      riskLevel: 'low'
    };
  }
}
