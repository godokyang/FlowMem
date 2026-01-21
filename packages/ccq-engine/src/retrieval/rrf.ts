// RRF (Reciprocal Rank Fusion) 融合算法

export interface SearchResult {
  docId: string;
  score: number;
}

export function rrf(
  listA: SearchResult[],
  listB: SearchResult[],
  k = 60,
  weights = { vector: 1.0, bm25: 1.0 }
): SearchResult[] {
  const scores = new Map<string, number>();

  const processList = (list: SearchResult[], weight: number) => {
    list.forEach((item, rank) => {
      const score = weight * (1 / (k + rank + 1));
      scores.set(item.docId, (scores.get(item.docId) || 0) + score);
    });
  };

  processList(listA, weights.bm25);
  processList(listB, weights.vector);

  return Array.from(scores.entries())
    .map(([docId, score]) => ({ docId, score }))
    .sort((a, b) => b.score - a.score);
}
