// AST Chunker - 基于语法树的代码切分

import type { Chunk } from '../../core/types.js';
import { ParserFactory } from '../parser-factory.js';

const BOUNDARIES: Record<string, string[]> = {
  typescript: ['function_declaration', 'class_declaration', 'interface_declaration', 'method_definition'],
  javascript: ['function_declaration', 'class_declaration', 'method_definition'],
  python: ['function_definition', 'class_definition'],
  go: ['function_declaration', 'type_declaration'],
  rust: ['function_item', 'struct_item', 'impl_item']
};

export class ASTChunker {
  async chunk(content: string, filePath: string, lang?: string): Promise<Chunk[]> {
    const parser = await ParserFactory.getParser(lang || this.detectLanguage(filePath));

    if (!parser) {
      const lineChunker = (await import('./line-chunker.js')).LineChunker;
      return new lineChunker().chunk(content, filePath);
    }

    const tree = parser.parse(content);
    const chunks: Chunk[] = [];
    const boundaryTypes = BOUNDARIES[lang || 'typescript'] || BOUNDARIES.typescript;

    const cursor = tree.walk();
    let depth = 0;

    const walk = () => {
      const nodeType = cursor.nodeType;

      if (boundaryTypes.includes(nodeType)) {
        const startLine = cursor.startPosition.row + 1;
        const endLine = cursor.endPosition.row + 1;

        chunks.push({
          id: `${filePath}:${startLine}`,
          path: filePath,
          text: content.split('\n').slice(startLine - 1, endLine).join('\n'),
          startLine,
          endLine,
          chunkType: 'code',
          symbolName: cursor.nodeText.split('(')[0].split('{')[0].trim(),
          tokens: Math.ceil((endLine - startLine + 1) * 10),
          hash: this.hash(content.split('\n').slice(startLine - 1, endLine).join('\n'))
        });
      }

      if (cursor.gotoFirstChild()) {
        depth++;
        walk();
        while (cursor.gotoNextSibling()) {
          walk();
        }
        cursor.gotoParent();
        depth--;
      }
    };

    walk();
    return chunks;
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust'
    };
    return langMap[ext || ''] || 'typescript';
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
