// 配置加载器

import type { Config } from './types.js';

const DEFAULT_CONFIG: Config = {
  rootPath: process.cwd(),
  dbPath: process.cwd() + '/.ccq/index.db',
  ignorePatterns: ['.gitignore', '.augmentignore'],
  languages: {
    tier1: ['typescript', 'javascript', 'python'],
    tier2: [],
    tier3: []
  },
  mode: 'hybrid',
  hybrid: {
    projectMdEnabled: true,
    projectMdPath: '.agentmem/project.md',
    autoInclude: true
  },
  retrieval: {
    topK: 10,
    rrfK: 60,
    weights: {
      vector: 1.0,
      bm25: 1.0
    }
  }
};

export class ConfigLoader {
  static load(root: string): Config {
    const configPath = root + '/.ccq/config.yaml';
    const fs = require('fs');
    
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG, rootPath, dbPath: root + '/.ccq/index.db' };
    }
    
    try {
      const yaml = require('js-yaml');
      const content = fs.readFileSync(configPath, 'utf-8');
      const userConfig = yaml.load(content);
      return { ...DEFAULT_CONFIG, ...userConfig, rootPath, dbPath: root + '/.ccq/index.db' };
    } catch (e) {
      console.warn('Failed to load config, using defaults:', e);
      return { ...DEFAULT_CONFIG, rootPath, dbPath: root + '/.ccq/index.db' };
    }
  }
}
