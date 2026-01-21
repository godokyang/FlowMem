import { createHash } from 'crypto';

export async function computeHashSHA256(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
