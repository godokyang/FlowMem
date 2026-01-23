/**
 * Git Hook 管理器
 *
 * 负责安装和管理 git hooks
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class GitHookManager {
  private gitDir: string;
  private hooksDir: string;

  constructor(private projectRoot: string) {
    this.gitDir = path.join(projectRoot, '.git');
    this.hooksDir = path.join(this.gitDir, 'hooks');
  }

  /**
   * 检查是否为 git 仓库
   */
  async isGitRepo(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.gitDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 安装 pre-commit hook
   */
  async installPreCommitHook(): Promise<void> {
    if (!(await this.isGitRepo())) {
      throw new Error('当前目录不是 git 仓库');
    }

    const hookPath = path.join(this.hooksDir, 'pre-commit');
    const hookContent = this.getPreCommitHookContent();

    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
    console.log('✅ pre-commit hook 安装成功');
  }

  /**
   * 获取 hook 内容
   */
  private getPreCommitHookContent(): string {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      return `#!/bin/sh
# FlowMem pre-commit hook

echo "🔍 Running FlowMem pre-commit audit..."
npx flowmem hook pre-commit
RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo "❌ FlowMem audit failed. Commit aborted."
  exit 1
fi

echo "✅ FlowMem audit passed."
exit 0
`;
    }

    return `#!/bin/sh
# FlowMem pre-commit hook

echo "🔍 Running FlowMem pre-commit audit..."
npx flowmem hook pre-commit
RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo "❌ FlowMem audit failed. Commit aborted."
  exit 1
fi

echo "✅ FlowMem audit passed."
exit 0
`;
  }

  /**
   * 卸载 hook
   */
  async uninstallHook(hookName: string): Promise<void> {
    const hookPath = path.join(this.hooksDir, hookName);
    
    try {
      await fs.unlink(hookPath);
      console.log(`✅ ${hookName} hook 卸载成功`);
    } catch (error) {
      // 忽略文件不存在错误
    }
  }
}
