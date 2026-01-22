// Rerank - 重排序器

import type { Chunk } from '../core/types';

export class Reranker {
  // Simple keyword boosting for now. Real implementation would use Cross-Encoder.
  static rerank(chunks: Chunk[], query: string): Chunk[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return chunks.sort((a, b) => {
      const scoreA = this.score(a, queryTerms);
      const scoreB = this.score(b, queryTerms);
      return scoreB - scoreA;
    });
  }

  private static score(chunk: Chunk, terms: string[]): number {
    let score = 0;
    const content = chunk.text.toLowerCase();
    
    for (const term of terms) {
      if (content.includes(term)) score += 1;
      if (chunk.symbolName?.toLowerCase().includes(term)) score += 3; // Boost symbol match
      if (chunk.path.toLowerCase().includes(term)) score += 2; // Boost path match
    }
    
    return score;
  }
}
