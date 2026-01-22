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
    this.ig.add(this.forceIgnore);

    const gitignorePath = path.join(root, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      this.ig.add(content);
    } catch {
    }

    const augmentignorePath = path.join(root, '.augmentignore');
    try {
      const content = await fs.readFile(augmentignorePath, 'utf-8');
      this.ig.add(content);
    } catch {
    }
  }

  ignores(filePath: string): boolean {
    return this.ig.ignores(filePath);
  }
}
