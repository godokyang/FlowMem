import type { Chunk } from '../../core/types';

export class LineChunker {
  async chunk(content: string, filePath: string): Promise<Chunk[]> {
    const lines = content.split('\n');
    const chunks: Chunk[] = [];
    const maxChars = 1500;
    const overlap = 200;
    let currentChunk: string[] = [];
    let startLine = 1;
    let currentChars = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWithNewline = line + '\n';

      if (currentChars + lineWithNewline.length > maxChars && currentChunk.length > 0) {
        chunks.push({
          id: `${filePath}:${startLine}`,
          path: filePath,
          text: currentChunk.join('\n'),
          startLine,
          endLine: startLine + currentChunk.length - 1,
          chunkType: 'text',
          tokens: Math.ceil(currentChars / 4),
          hash: this.hash(currentChunk.join('\n'))
        });

        const overlapLines = Math.floor(overlap / 100);
        currentChunk = currentChunk.slice(-overlapLines);
        startLine = i - overlapLines + 1;
        currentChars = currentChunk.reduce((sum, l) => sum + l.length + 1, 0);
      }

      currentChunk.push(line);
      currentChars += lineWithNewline.length;
    }

    if (currentChunk.length > 0) {
      chunks.push({
        id: `${filePath}:${startLine}`,
        path: filePath,
        text: currentChunk.join('\n'),
        startLine,
        endLine: startLine + currentChunk.length - 1,
        chunkType: 'text',
        tokens: Math.ceil(currentChars / 4),
        hash: this.hash(currentChunk.join('\n'))
      });
    }

    return chunks;
  }

  private hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(16);
  }
}
