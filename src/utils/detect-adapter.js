const path = require('path');
const fs = require('fs-extra');

const ADAPTER_MARKERS = [
  { marker: '.cursor', adapter: 'cursor' },
  { marker: '.cursorrules', adapter: 'cursor' },
  { marker: '.claude', adapter: 'claude-code' },
  { marker: '.windsurf', adapter: 'windsurf' },
  { marker: '.windsurfrules', adapter: 'windsurf' },
  { marker: '.github/copilot-instructions.md', adapter: 'copilot' },
  { marker: '.cline', adapter: 'cline' },
  { marker: '.clinerules', adapter: 'cline' },
  { marker: '.trae', adapter: 'trae' }
];

function detectAdapter(projectRoot) {
  for (const { marker, adapter } of ADAPTER_MARKERS) {
    const markerPath = path.join(projectRoot, marker);
    if (fs.existsSync(markerPath)) {
      return adapter;
    }
  }
  return 'claude-code';
}

module.exports = { detectAdapter };
