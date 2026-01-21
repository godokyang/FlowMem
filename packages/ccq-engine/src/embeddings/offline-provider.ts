// Offline Embeddings Provider - Transformers.js
import { pipeline } from '@xenova/transformers';

export interface IEmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
  dim: number;
}

export class OfflineProvider implements IEmbeddingsProvider {
  private extractor: any;
  public readonly dim = 384;

  async init() {
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data));
    }
    return embeddings;
  }
}
