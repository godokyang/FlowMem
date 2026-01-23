/**
 * 适配器类型定义
 *
 * 定义编辑器/IDE 适配器接口
 */

/**
 * 适配器配置
 */
export interface AdapterConfig {
  /**
   * 适配器名称
   */
  name: string;

  /**
   * 目标平台
   */
  target: 'vscode' | 'cursor' | 'windsurf' | 'copilot' | 'jetbrains' | 'nvim' | 'emacs';

  /**
   * 输出路径
   */
  outputPath: string;

  /**
   * 模板文件路径
   */
  templatePath: string;
}

/**
 * 适配器上下文
 */
export interface AdapterContext {
  /**
   * 项目根目录
   */
  projectRoot: string;

  /**
   * FlowMem 配置
   */
  flowMemConfig: any;
}

/**
 * 适配器接口
 */
export interface Adapter {
  /**
   * 生成配置
   */
  generate(context: AdapterContext): Promise<void>;
}
