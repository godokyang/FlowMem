import { get_encoding } from 'tiktoken';

let enc: any = null;

export function countTokens(text: string): number {
  if (!enc) {
    enc = get_encoding('cl100k_base');
  }
  return enc.encode(text).length;
}
