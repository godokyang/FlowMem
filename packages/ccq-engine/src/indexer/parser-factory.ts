// @ts-ignore
import Parser from 'web-tree-sitter';
import path from 'path';
import fs from 'fs/promises';

export class ParserFactory {
  private static initialized = false;
  private static parsers = new Map<string, any>();
  private static languages = new Map<string, any>();

  static async init() {
    if (this.initialized) return;

    const wasmDir = path.join(__dirname, '../../node_modules/web-tree-sitter');
    await Parser.init({
      locateFile(scriptName: string) {
        return path.join(wasmDir, scriptName);
      }
    });

    this.initialized = true;
  }

  static async getLanguage(lang: string) {
    if (this.languages.has(lang)) {
      return this.languages.get(lang);
    }

    const wasmPaths = [
      path.join(__dirname, `../../assets/tree-sitter-${lang}.wasm`),
      path.join(__dirname, `../../node_modules/tree-sitter-${lang}/tree-sitter-${lang}.wasm`)
    ];

    for (const wasmPath of wasmPaths) {
      try {
        await fs.access(wasmPath);
        const language = await Parser.Language.load(wasmPath);
        this.languages.set(lang, language);
        return language;
      } catch {
        continue;
      }
    }

    return null;
  }

  static async getParser(lang: string) {
    const language = await this.getLanguage(lang);
    if (!language) return null;

    if (!this.parsers.has(lang)) {
      const parser = new Parser();
      parser.setLanguage(language);
      this.parsers.set(lang, parser);
    }

    return this.parsers.get(lang);
  }
}
