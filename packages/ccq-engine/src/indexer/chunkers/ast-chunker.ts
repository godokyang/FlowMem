// AST Chunker - 基于语法树的代码切分

import type { Chunk } from '../../core/types.js';
import { ParserFactory } from '../parser-factory.js';
import { LineChunker } from './line-chunker.js';

const BOUNDARIES: Record<string, string[]> = {
  typescript: ['function_declaration', 'class_declaration', 'interface_declaration', 'method_definition'],
  javascript: ['function_declaration', 'class_declaration', 'method_definition'],
  python: ['function_definition', 'class_definition'],
  go: ['function_declaration', 'type_declaration'],
  rust: ['function_item', 'struct_item', 'impl_item'],
  c: ['function_definition', 'struct_specifier'],
  cpp: ['function_definition', 'class_specifier', 'struct_specifier'],
  java: ['class_declaration', 'method_declaration', 'interface_declaration'],
  ruby: ['method', 'class', 'module'],
  php: ['function_definition', 'class_declaration', 'method_declaration']
};

export class ASTChunker {
  private lineChunker = new LineChunker();
  private maxChunkSize = 2000;

  async chunk(content: string, filePath: string, lang?: string): Promise<Chunk[]> {
    const parser = await ParserFactory.getParser(lang || this.detectLanguage(filePath));

    if (!parser) {
      return this.lineChunker.chunk(content, filePath);
    }

    const tree = parser.parse(content);
    const chunks: Chunk[] = [];
    const boundaryTypes = BOUNDARIES[lang || 'typescript'] || BOUNDARIES.typescript;

    const cursor = tree.walk();

    const walk = (): boolean => {
      const nodeType = cursor.nodeType;
      
      // If node is a boundary
      if (boundaryTypes.includes(nodeType)) {
        const startLine = cursor.startPosition.row + 1;
        const endLine = cursor.endPosition.row + 1;
        const text = content.split('\n').slice(startLine - 1, endLine).join('\n');

        if (text.length <= this.maxChunkSize) {
          chunks.push({
            id: `${filePath}:${startLine}`,
            path: filePath,
            text,
            startLine,
            endLine,
            chunkType: 'code',
            symbolName: cursor.nodeText.split('(')[0].split('{')[0].trim(),
            tokens: Math.ceil((endLine - startLine + 1) * 10),
            hash: this.hash(text)
          });
          return true; // Chunked this node, skip children
        } else {
          // Too big, recurse
          let childChunked = false;
          if (cursor.gotoFirstChild()) {
            do {
              if (walk()) childChunked = true;
            } while (cursor.gotoNextSibling());
            cursor.gotoParent();
          }

          if (!childChunked) {
            // Big node with no inner chunks, force line chunking
            // We can't await here easily if walk is sync. 
            // Actually lineChunker.chunk is async.
            // We'll treat this as "not handled" here and let the caller handle?
            // Or better: make walk async? Or make lineChunker sync?
            // LineChunker logic is purely sync in implementation (just loop).
            // Let's rely on the fact that if we return false, parent might handle it?
            // But we are the parent.
            
            // Simplification: If a boundary node is huge and has no boundary children,
            // we accept it as a large chunk (maybe just cap it?) or
            // just let it be. Usually 2000 chars is soft limit.
            // If it's REALLY huge (e.g. 10k), we should split.
            // For now, let's just add it even if big if no children handled it.
             chunks.push({
              id: `${filePath}:${startLine}`,
              path: filePath,
              text,
              startLine,
              endLine,
              chunkType: 'code',
              symbolName: cursor.nodeText.split('(')[0].split('{')[0].trim(),
              tokens: Math.ceil((endLine - startLine + 1) * 10),
              hash: this.hash(text)
            });
            return true;
          }
          return true; // Children handled parts of it
        }
      }

      // Not a boundary, check children
      let anyChildHandled = false;
      if (cursor.gotoFirstChild()) {
        do {
          if (walk()) anyChildHandled = true;
        } while (cursor.gotoNextSibling());
        cursor.gotoParent();
      }
      return anyChildHandled;
    };

    walk();
    return chunks;
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      c: 'c',
      h: 'c',
      cpp: 'cpp',
      hpp: 'cpp',
      java: 'java',
      rb: 'ruby',
      php: 'php'
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
