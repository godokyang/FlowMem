// Vector Searcher - Cosine Similarity

export interface SearchResult {
  docId: string;
  score: number;
}

export class VectorSearcher {
  private vectors = new Map<string, Float32Array>();

  loadVectors(vectorList: { id: string; vector: Float32Array }[]) {
    for (const { id, vector } of vectorList) {
      this.vectors.set(id, vector);
    }
  }

  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) throw new Error('Vector dimension mismatch');
    
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  search(queryVec: Float32Array, topK: number = 10): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [docId, vec] of this.vectors.entries()) {
      const score = this.cosineSimilarity(queryVec, vec);
      results.push({ docId, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
