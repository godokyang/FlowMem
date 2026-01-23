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
        const checkResult = await this.interceptor.checkWrite({
          filePath: file,
          content: '',
          operation: 'modify',
          source: { type: 'direct', timestamp: new Date() }
        });

        // 如果文件被完全禁止修改
        if (!checkResult.allowed) {
          console.error(`❌ 拦截到受保护文件修改: ${file}`);
          console.error(`原因: ${checkResult.reason}`);
          return false;
        }

        // 如果文件需要确认（高风险文件）
        if (checkResult.requiresConfirmation) {
          console.error(`⚠️  检测到高风险文件修改: ${file}`);
          console.error(`原因: ${checkResult.reason}`);
          console.error(`提示: 高风险文件需要在工作流中通过审核后才能提交`);
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
