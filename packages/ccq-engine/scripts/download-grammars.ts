const fs = require('fs');
const path = require('path');
const https = require('https');

const LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'c',
  'cpp',
  'java',
  'ruby',
  'php'
];

const ASSETS_DIR = path.join(__dirname, '../assets');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function main() {
  console.log('Downloading Tree-sitter WASM files...');
  
  for (const lang of LANGUAGES) {
    const fileName = `tree-sitter-${lang}.wasm`;
    const dest = path.join(ASSETS_DIR, fileName);
    
    if (fs.existsSync(dest)) {
      console.log(`✓ ${lang} (already exists)`);
      continue;
    }

    console.log(`↓ Downloading ${lang}...`);
    try {
       console.log(`  (Skipping actual download - requires build environment)`);
       console.log(`  Please run 'npx tree-sitter build-wasm' in language repos or provide .wasm files in assets/`);
    } catch (e) {
      console.error(`✗ Failed to download ${lang}:`, e);
    }
  }
}

main().catch(console.error);
