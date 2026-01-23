/**
 * 适配器配置
 *
 * 定义所有支持的适配器配置
 */

import { AdapterConfig } from './types';

export const ADAPTERS: AdapterConfig[] = [
  {
    name: 'VSCode',
    target: 'vscode',
    outputPath: '.vscode/flowmem.json',
    templatePath: 'templates/vscode.json'
  },
  {
    name: 'Cursor',
    target: 'cursor',
    outputPath: '.cursor/rules/flowmem.json',
    templatePath: 'templates/cursor.json'
  },
  {
    name: 'Windsurf',
    target: 'windsurf',
    outputPath: '.windsurf/flowmem.json',
    templatePath: 'templates/windsurf.json'
  },
  {
    name: 'Copilot',
    target: 'copilot',
    outputPath: '.github/copilot-instructions.md',
    templatePath: 'templates/copilot.md'
  },
  {
    name: 'JetBrains',
    target: 'jetbrains',
    outputPath: '.idea/flowmem.xml',
    templatePath: 'templates/jetbrains.xml'
  },
  {
    name: 'Neovim',
    target: 'nvim',
    outputPath: '.nvim/flowmem.lua',
    templatePath: 'templates/nvim.lua'
  },
  {
    name: 'Emacs',
    target: 'emacs',
    outputPath: '.emacs.d/flowmem.el',
    templatePath: 'templates/emacs.el'
  }
];
