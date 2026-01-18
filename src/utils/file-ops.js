const path = require('path');
const fs = require('fs-extra');

async function copyDirectory(src, dest, options = {}) {
  const { force = false } = options;
  
  if (fs.existsSync(dest) && !force) {
    throw new Error(`目标目录已存在: ${dest}`);
  }
  
  await fs.copy(src, dest, { overwrite: force });
}

async function copyFile(src, dest, options = {}) {
  const { force = false } = options;
  
  if (fs.existsSync(dest) && !force) {
    throw new Error(`目标文件已存在: ${dest}`);
  }
  
  await fs.copy(src, dest, { overwrite: force });
}

async function ensureDir(dir) {
  await fs.ensureDir(dir);
}

module.exports = {
  copyDirectory,
  copyFile,
  ensureDir
};
