/**
 * Pre-commit 审计逻辑
 *
 * 检查是否有未经授权的受保护文件修改
 */

import { FileInterceptor } from './file-interceptor';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PreCommitAudit {
  constructor(private interceptor: FileInterceptor) {}

  /**
   * 执行审计
   */
  async audit(): Promise<boolean> {
    try {
      const stagedFiles = await this.getStagedFiles();
      
      for (const file of stagedFiles) {
        // 检查文件是否受保护
        // 注意：这里我们假设所有 staged 的修改都是 'modify' 操作
        // 实际上应该更精细地检查操作类型
        const isProtected = await this.interceptor.checkWrite({
          filePath: file,
          content: '',
          operation: 'modify',
          source: { type: 'direct', timestamp: new Date() }
        });

        if (!isProtected.allowed) {
          console.error(`❌ 拦截到受保护文件修改: ${file}`);
          console.error(`原因: ${isProtected.reason}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('审计过程出错:', error);
      return false;
    }
  }

  /**
   * 获取暂存区文件列表
   */
  private async getStagedFiles(): Promise<string[]> {
    const { stdout } = await execAsync('git diff --cached --name-only');
    return stdout.split('\n').filter(line => line.trim().length > 0);
  }
}
