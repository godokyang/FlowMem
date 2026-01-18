#!/bin/bash
# ============================================================================
# build-adapters.sh - FlowMem 适配器打包脚本
# ============================================================================
# 功能:
# 1. 读取 scripts/common-rules-template.md
# 2. 针对不同工具（Claude, Cursor 等）替换路径占位符
# 3. 将规则、模板、脚本打包到 dist/ 目录下的独立文件夹中
# 4. 生成自包含的 "Copy-Paste Ready" 分发包
# ============================================================================

set -e

# 目录定义
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
ADAPTERS_DIR="$ROOT_DIR/adapters"
TEMPLATE_FILE="$ROOT_DIR/adapters/common-rules.md"

# 清理构建目录（保留 common-rules.md）
echo "清理旧的适配器包..."
find "$ADAPTERS_DIR" -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +

echo "构建 FlowMem 适配器包..."
echo "目标目录: $ADAPTERS_DIR"

# 辅助函数：构建标准适配器包 (Cursor, Windsurf, Trae, Cline 等)
# 参数: $1=适配器名称, $2=规则文件名, $3=静态资源目录名
build_standard_pack() {
    local name="$1"
    local rule_filename="$2"
    local assets_dir="$3" # e.g., ".flowmem" 或 ".cursor/flowmem"
    
    local pack_dir="$ADAPTERS_DIR/$name"
    mkdir -p "$pack_dir"
    mkdir -p "$pack_dir/$assets_dir"
    
    echo "📦 构建 $name 包..."
    
    # 1. 复制静态资源 (Templates, Scripts, Examples, Docs)
    cp -r "$ROOT_DIR/templates" "$pack_dir/$assets_dir/"
    cp -r "$ROOT_DIR/examples" "$pack_dir/$assets_dir/"
    cp -r "$ROOT_DIR/docs" "$pack_dir/$assets_dir/"
    
    # 2. 复制并处理脚本 (setup.sh 及其他)
    mkdir -p "$pack_dir/$assets_dir/scripts"
    cp "$SCRIPT_DIR/setup.sh" "$pack_dir/$assets_dir/scripts/"
    cp "$SCRIPT_DIR/archive-task.sh" "$pack_dir/$assets_dir/scripts/"
    cp "$SCRIPT_DIR/refresh-context.sh" "$pack_dir/$assets_dir/scripts/"
    chmod +x "$pack_dir/$assets_dir/scripts/"*.sh
    
    # 3. 生成规则文件
    # 替换占位符为相对路径
    # {{SETUP_SCRIPT}} -> $assets_dir/scripts/setup.sh
    # {{TEMPLATE_DIR}} -> $assets_dir/templates
    # {{EXAMPLE_DIR}}  -> $assets_dir/examples
    # {{SCRIPT_DIR}}   -> $assets_dir/scripts
    # {{DOCS_DIR}}     -> $assets_dir/docs
    
    sed -e "s|{{SETUP_SCRIPT}}|$assets_dir/scripts/setup.sh|g" \
        -e "s|{{TEMPLATE_DIR}}|$assets_dir/templates|g" \
        -e "s|{{EXAMPLE_DIR}}|$assets_dir/examples|g" \
        -e "s|{{SCRIPT_DIR}}|$assets_dir/scripts|g" \
        -e "s|{{DOCS_DIR}}|$assets_dir/docs|g" \
        "$TEMPLATE_FILE" > "$pack_dir/$rule_filename"
        
    echo "  ✓ 生成规则: $rule_filename"
    echo "  ✓ 复制资源到: $assets_dir/"
}

# ============================================================================
# 1. Cursor Adapter
# 结构: Root/.cursorrules + Root/.flowmem/
# ============================================================================
build_standard_pack "cursor" ".cursorrules" ".flowmem"

# ============================================================================
# 2. Windsurf Adapter
# 结构: Root/.windsurfrules + Root/.flowmem/
# ============================================================================
build_standard_pack "windsurf" ".windsurfrules" ".flowmem"

# ============================================================================
# 3. Cline (Roo) Adapter
# 结构: Root/.clinerules + Root/.flowmem/
# ============================================================================
build_standard_pack "cline" ".clinerules" ".flowmem"

# ============================================================================
# 4. Trae Adapter
# 结构: Root/.trae/rules/context-memory.md + Root/.flowmem/
# 注意: Trae 的规则文件在子目录，但 .flowmem 在根目录，路径依然有效
# ============================================================================
# 特殊处理 Trae 目录结构
mkdir -p "$ADAPTERS_DIR/trae/.trae/rules"
# 使用 build_standard_pack 生成到临时位置，然后移动
build_standard_pack "trae-temp" "context-memory.md" ".flowmem"
mv "$ADAPTERS_DIR/trae-temp/.flowmem" "$ADAPTERS_DIR/trae/"
mv "$ADAPTERS_DIR/trae-temp/context-memory.md" "$ADAPTERS_DIR/trae/.trae/rules/"
rm -rf "$ADAPTERS_DIR/trae-temp"
echo "  ✓ 调整 Trae 目录结构"

# ============================================================================
# 5. Copilot Adapter
# 结构: Root/.github/copilot-instructions.md + Root/.flowmem/
# ============================================================================
mkdir -p "$ADAPTERS_DIR/copilot/.github"
# build_standard_pack 生成到临时位置
build_standard_pack "copilot-temp" "copilot-instructions.md" ".flowmem"
mv "$ADAPTERS_DIR/copilot-temp/.flowmem" "$ADAPTERS_DIR/copilot/"
mv "$ADAPTERS_DIR/copilot-temp/copilot-instructions.md" "$ADAPTERS_DIR/copilot/.github/"
rm -rf "$ADAPTERS_DIR/copilot-temp"
echo "  ✓ 调整 Copilot 目录结构"

# ============================================================================
# 6. Claude Code Adapter (Self-Contained 设计)
# 结构: 所有资源都在 .claude/skills/context-memory-system/ 内
# 优势: 整个 Skill 目录可作为完整包，安装到项目级或全局级
# ============================================================================
echo "📦 构建 claude-code 包..."
CLAUDE_PACK="$ADAPTERS_DIR/claude-code"
CLAUDE_SKILL_DIR=".claude/skills/context-memory-system"
FULL_PATH="$CLAUDE_PACK/$CLAUDE_SKILL_DIR"

mkdir -p "$FULL_PATH"

# 复制所有资源到 Skill 目录内（自包含设计）
cp -r "$ROOT_DIR/templates" "$FULL_PATH/"
cp -r "$ROOT_DIR/examples" "$FULL_PATH/"
cp -r "$ROOT_DIR/docs" "$FULL_PATH/"
mkdir -p "$FULL_PATH/scripts"
cp "$SCRIPT_DIR/setup.sh" "$FULL_PATH/scripts/"
cp "$SCRIPT_DIR/archive-task.sh" "$FULL_PATH/scripts/"
cp "$SCRIPT_DIR/refresh-context.sh" "$FULL_PATH/scripts/"
chmod +x "$FULL_PATH/scripts/"*.sh

# 生成 YAML Frontmatter 并拼接规则
DEST_FILE="$FULL_PATH/SKILL.md"
echo "---" > "$DEST_FILE"
echo "name: context-memory-system" >> "$DEST_FILE"
echo "description: FlowMem 上下文记忆系统。使用持久化 Markdown 文件管理 AI 工作记忆，在开始复杂任务、多文件修改时自动激活。" >> "$DEST_FILE"
echo "---" >> "$DEST_FILE"
echo "" >> "$DEST_FILE"

# 路径相对于 Skill 目录（支持全局和项目级安装）
# 用户可以将整个 .claude/skills/context-memory-system/ 复制到任何位置
sed -e "s|{{SETUP_SCRIPT}}|$CLAUDE_SKILL_DIR/scripts/setup.sh|g" \
    -e "s|{{TEMPLATE_DIR}}|$CLAUDE_SKILL_DIR/templates|g" \
    -e "s|{{EXAMPLE_DIR}}|$CLAUDE_SKILL_DIR/examples|g" \
    -e "s|{{SCRIPT_DIR}}|$CLAUDE_SKILL_DIR/scripts|g" \
    -e "s|{{DOCS_DIR}}|$CLAUDE_SKILL_DIR/docs|g" \
    "$TEMPLATE_FILE" >> "$DEST_FILE"

echo "  ✓ 生成 Skill: $CLAUDE_SKILL_DIR/SKILL.md (Self-Contained)"

# ============================================================================
# 7. Gemini Adapter
# 结构: Root/gemini-rules.md + Root/.flowmem/
# 注意: Gemini 目前没有标准规则文件位置，使用通用命名
# ============================================================================
build_standard_pack "gemini" "gemini-rules.md" ".flowmem"

echo ""
echo "🎉构建完成！请查看 adapters/ 目录。"
