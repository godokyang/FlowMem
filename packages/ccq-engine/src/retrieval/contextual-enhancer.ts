// Contextual Retrieval - Chunk上下文增强

import type { Chunk } from '../core/types';

export class ContextualEnhancer {
  static enhance(chunk: Chunk, context: { file?: string; className?: string; functionName?: string }): string {
    let enhanced = chunk.text;
    
    // Add context header if available
    const contextParts = [];
    if (context.file) contextParts.push(`File: ${context.file}`);
    if (context.className) contextParts.push(`Class: ${context.className}`);
    if (context.functionName) contextParts.push(`Function: ${context.functionName}`);
    
    if (contextParts.length > 0) {
      enhanced = `/* Context: ${contextParts.join(', ')} */\n${enhanced}`;
    }
    
    return enhanced;
  }
}
