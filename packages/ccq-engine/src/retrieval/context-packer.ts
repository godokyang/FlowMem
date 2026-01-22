// Context Packer - 格式化输出

import type { Chunk } from '../core/types.js';
import { ContextualEnhancer } from './contextual-enhancer.js';

export class ContextPacker {
  pack(chunks: Chunk[], maxTokens: number = 100000): string {
    let result = '';
    let currentTokens = 0;

    for (const chunk of chunks) {
      const enhancedText = ContextualEnhancer.enhance(chunk, {
        file: chunk.path,
        functionName: chunk.symbolName
      });

      const header = `=== FILE: ${chunk.path} (lines ${chunk.startLine}-${chunk.endLine}) ===\n`;
      const content = `CHUNK: ${chunk.chunkType}\n---\n${enhancedText}\n\n`;
      const segment = header + content;
      const tokens = Math.ceil(segment.length / 4);

      if (currentTokens + tokens > maxTokens) break;
      
      result += segment;
      currentTokens += tokens;
    }
    return result;
  }
}
