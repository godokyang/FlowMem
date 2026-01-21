// 文件扫描器

import { glob } from 'glob';
import { IgnoreManager } from './ignore-manager.js';

export class FileScanner {
  constructor(private ignoreManager: IgnoreManager) {}

  async scan(root: string): Promise<string[]> {
    const allFiles = await glob('**/*', {
      cwd: root,
      nodir: true,
      dot: true,
      absolute: false
    });

    return allFiles.filter(f => !this.ignoreManager.ignores(f));
  }
}
