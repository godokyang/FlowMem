/**
 * 适配器构建器
 *
 * 负责构建适配器配置
 */

import { Adapter, AdapterConfig, AdapterContext } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AdapterBuilder implements Adapter {
  constructor(private config: AdapterConfig) {}

  async generate(context: AdapterContext): Promise<void> {
    try {
      const templateContent = await this.readTemplate();
      const generatedContent = this.processTemplate(templateContent, context);
      await this.writeOutput(generatedContent, context.projectRoot);
      console.log(`✅ ${this.config.name} 适配器生成成功`);
    } catch (error) {
      console.error(`❌ ${this.config.name} 适配器生成失败:`, error);
    }
  }

  private async readTemplate(): Promise<string> {
    return fs.readFile(this.config.templatePath, 'utf-8');
  }

  private processTemplate(template: string, context: AdapterContext): string {
    // 简单的模板替换
    return template.replace(/{{projectRoot}}/g, context.projectRoot)
      .replace(/{{flowMemConfig}}/g, JSON.stringify(context.flowMemConfig, null, 2));
  }

  private async writeOutput(content: string, projectRoot: string): Promise<void> {
    const outputPath = path.join(projectRoot, this.config.outputPath);
    const outputDir = path.dirname(outputPath);

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
  }
}
