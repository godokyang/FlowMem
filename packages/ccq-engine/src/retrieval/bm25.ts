// BM25 索引实现

export class BM25Index {
  private index = new Map<string, Map<string, number>>();
  private docLengths = new Map<string, number>();
  private avgDocLength = 0;
  private totalDocs = 0;
  private k1 = 1.5;
  private b = 0.75;

  add(docId: string, text: string) {
    const tokens = this.tokenize(text);
    this.docLengths.set(docId, tokens.length);
    this.totalDocs++;

    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    for (const [term, freq] of termFreq) {
      if (!this.index.has(term)) {
        this.index.set(term, new Map());
      }
      this.index.get(term)!.set(docId, freq);
    }

    this.avgDocLength = Array.from(this.docLengths.values())
      .reduce((sum, len) => sum + len, 0) / this.totalDocs;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().match(/[a-z0-9]+/g) || [];
  }

  search(query: string, topK: number = 10) {
    const queryTokens = this.tokenize(query);
    const scores = new Map<string, number>();

    for (const term of queryTokens) {
      const postings = this.index.get(term);
      if (!postings) continue;

      const df = postings.size;
      const idf = Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);

      for (const [docId, tf] of postings) {
        const docLen = this.docLengths.get(docId)!;
        const normTF = (tf * (this.k1 + 1)) / 
          (tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength)));
        
        const score = idf * normTF;
        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }

    return Array.from(scores.entries())
      .map(([docId, score]) => ({ docId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
