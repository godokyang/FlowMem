// Ignore 策略管理器

import ignore from 'ignore';
import fs from 'fs/promises';
import path from 'path';

export class IgnoreManager {
  private ig = ignore();
  private forceIgnore = [
    '.env*',
    '**/*.pem',
    '**/*.key',
    '**/id_rsa',
    'config/secrets.*',
    'node_modules',
    '.git',
    '.ccq',
    'coverage',
    'dist'
  ];

  async loadRules(root: string) {
    const gitignorePath = path.join(root, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      this.ig.add(content);
    } catch {
    }

    this.ig.add(this.forceIgnore);
  }

  ignores(filePath: string): boolean {
    return this.ig.ignores(filePath);
  }
}
