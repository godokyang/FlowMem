/**
 * 文件操作工具
 */
import fs from 'fs';
import path from 'path';

// .agentmem 目录名
export const AGENTMEM_DIR = '.agentmem';

/**
 * 获取 .agentmem 目录路径
 */
export function getAgentmemPath(cwd: string = process.cwd()): string {
  return path.join(cwd, AGENTMEM_DIR);
}

/**
 * 检查 .agentmem 目录是否存在
 */
export function agentmemExists(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getAgentmemPath(cwd));
}

/**
 * 确保目录存在
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 读取文件内容
 */
export function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 写入文件内容
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 解析 Markdown frontmatter
 */
export function parseFrontmatter<T>(content: string): { frontmatter: T; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return null;
  }

  try {
    const frontmatterLines = match[1].split('\n');
    const frontmatter: Record<string, unknown> = {};

    for (const line of frontmatterLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        // 尝试解析数字
        if (/^\d+$/.test(value as string)) {
          value = parseInt(value as string, 10);
        }
        // 尝试解析布尔值
        else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        }
        // 移除引号
        else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        frontmatter[key] = value;
      }
    }

    return {
      frontmatter: frontmatter as T,
      body: match[2]
    };
  } catch {
    return null;
  }
}

/**
 * 生成 Markdown frontmatter
 */
export function generateFrontmatter(data: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * 获取当前时间戳 (ISO 格式)
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = 'ID'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}
