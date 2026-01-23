/**
 * Simple Retriever - 降级实现
 *
 * 当 CCQEngine 不可用时使用的简单检索器
 */

import { BaseContextRetriever } from './retriever';
import * as fs from 'fs';
import * as path from 'path';

export class SimpleRetriever extends BaseContextRetriever {
  readonly name = 'simple';

  constructor(private readonly projectRoot: string) {
    super();
  }

  async retrieve(query: import('./types').ContextQuery): Promise<import('./types').ContextResult> {
    const chunks: import('./types').CodeChunk[] = [];
    const keywords = query.text.split(/\s+/).filter(k => k.length > 2);

    let filesToCheck: string[] = [];

    // 1. 确定搜索范围
    if (query.fileFilters && query.fileFilters.length > 0) {
      for (const filePattern of query.fileFilters) {
        const filePaths = await this.findFiles(filePattern);
        filesToCheck.push(...filePaths);
      }
    } else {
      filesToCheck = await this.findAllSourceFiles();
    }

    // 去重
    filesToCheck = [...new Set(filesToCheck)];

    // 2. 简单的关键词匹配搜索
    for (const filePath of filesToCheck) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const score = this.calculateRelevance(content, keywords);

        if (score > 0) {
          const ext = path.extname(filePath);
          const language = this.getLanguage(ext);
          
          chunks.push({
            filePath: path.relative(this.projectRoot, filePath),
            language,
            content: content.substring(0, 2000), // 简单的截断，实际应截取相关片段
            relevanceScore: score
          });
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    // 3. 排序并截取
    chunks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    return {
      chunks: chunks.slice(0, 5), // 只返回最相关的 5 个
      tokensUsed: chunks.reduce((acc, c) => acc + c.content.length / 4, 0)
    };
  }

  isAvailable(): boolean {
    try {
      fs.accessSync(this.projectRoot);
      return true;
    } catch {
      return false;
    }
  }

  private calculateRelevance(content: string, keywords: string[]): number {
    if (keywords.length === 0) return 1; // 如果没有关键词，视为相关（上下文）

    let score = 0;
    const lowerContent = content.toLowerCase();
    
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerContent.includes(lowerKeyword)) {
        score += 1;
        // 简单的频率加权
        const count = lowerContent.split(lowerKeyword).length - 1;
        score += Math.min(count * 0.1, 1);
      }
    }

    return score;
  }

  private async findFiles(pattern: string): Promise<string[]> {
    const globPattern = pattern.startsWith('**/')
      ? pattern.substring(3)
      : `**/${pattern}`;

    const { glob } = await import('glob');
    const files = glob.sync(globPattern, {
      cwd: this.projectRoot,
      absolute: true, // 使用绝对路径
      nodir: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    });

    return files;
  }

  private async findAllSourceFiles(): Promise<string[]> {
    const { glob } = await import('glob');
    const extensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h'];
    const pattern = `**/*.{${extensions.join(',')}}`;

    const files = glob.sync(pattern, {
      cwd: this.projectRoot,
      absolute: true,
      nodir: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    });

    return files;
  }

  private getLanguage(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c'
    };
    return map[ext] || 'text';
  }
}
