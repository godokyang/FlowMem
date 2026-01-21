#!/bin/bash
# ============================================================================
# init-agentmem.sh - AI 上下文记忆系统初始化脚本
# ============================================================================
# ⚠️  DEPRECATED: 此脚本已废弃，请使用 CLI 命令代替
#
# 新用法: 
#   npx flowmem init              # 使用 npm 包（推荐）
#   flowmem init                  # 如已全局安装
#
# 原用法: ./init-agentmem.sh [项目目录]
# ============================================================================

echo "⚠️  警告: 此脚本已废弃"
echo "请使用新的 CLI 命令: npx flowmem init"
echo ""
echo "继续执行旧版本初始化..."
echo ""

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认目录
TARGET_DIR="${1:-.}"

# 模板目录（相对于脚本位置）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="${SCRIPT_DIR}/../templates"
EXAMPLES_DIR="${SCRIPT_DIR}/../examples"
DOCS_DIR="${SCRIPT_DIR}/../docs"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  AI 上下文记忆系统初始化${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 检查目标目录
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}目录 $TARGET_DIR 不存在，正在创建...${NC}"
    mkdir -p "$TARGET_DIR"
fi

cd "$TARGET_DIR"
TARGET_DIR=$(pwd)
echo -e "目标目录: ${GREEN}$TARGET_DIR${NC}"
echo ""

# 定义核心目录变量
AGENTMEM_DIR=".agentmem"

# 主逻辑
main() {
    # 1. 初始化目录结构
    init_directory_structure

    # 2. 生成所有适配器规则
    echo "正在生成所有适配器配置..."
    
    # 2.1 Claude Code
    mkdir -p .claude/skills/context-memory-system
    local dest=".claude/skills/context-memory-system/SKILL.md"
    echo "---" > "$dest"
    echo "name: context-memory-system" >> "$dest"
    echo "description: 使用持久化 Markdown 文件管理 AI 工作记忆。在开始复杂任务、多步骤项目时自动激活。" >> "$dest"
    echo "---" >> "$dest"
    echo "" >> "$dest"
    # 手动替换并追加
    sed -e "s|{{SETUP_SCRIPT}}|.agentmem/scripts/setup.sh|g" \
        -e "s|{{TEMPLATE_DIR}}|.agentmem/templates|g" \
        -e "s|{{EXAMPLE_DIR}}|.agentmem/examples|g" \
        -e "s|{{SCRIPT_DIR}}|.agentmem/scripts|g" \
        -e "s|{{DOCS_DIR}}|.agentmem/docs|g" \
        "$SCRIPT_DIR/../adapters/common-rules.md" >> "$dest"
            
    echo "✅ 已生成 Claude Code Skill: $dest"

    # 2.2 Cursor
    copy_rule_file "adapters/common-rules.md" ".cursorrules"
    echo "✅ 已生成 Cursor 规则 (.cursorrules)"

    # 2.3 Windsurf
    copy_rule_file "adapters/common-rules.md" ".windsurfrules"
    echo "✅ 已生成 Windsurf 规则 (.windsurfrules)"

    # 2.4 Trae
    mkdir -p .trae/rules
    copy_rule_file "adapters/common-rules.md" ".trae/rules/context-memory.md"
    echo "✅ 已生成 Trae 规则 (.trae/rules/context-memory.md)"

    # 2.5 Cline (Roo)
    copy_rule_file "adapters/common-rules.md" ".clinerules"
    echo "✅ 已生成 Cline 规则 (.clinerules)"

    # 2.6 Gemini
    copy_rule_file "adapters/common-rules.md" "gemini-rules.md"
    echo "✅ 已生成 Gemini 规则 (gemini-rules.md)"

    # 2.7 VS Code Copilot
    mkdir -p .github
    copy_rule_file "adapters/common-rules.md" ".github/copilot-instructions.md"
    echo "✅ 已生成 Copilot 规则 (.github/copilot-instructions.md)"

    # 2.8 通用规则
    copy_rule_file "adapters/common-rules.md" "agentmem-rules.md"
    echo "✅ 已生成通用规则 (agentmem-rules.md)"

    # 3. 复制模板文件
    copy_template "project.md" ".agentmem/project.md"
    
    # 3.1 复制所有模板到 .agentmem/templates 作为 AI 参考
    cp -r "$TEMPLATE_DIR/"* "$AGENTMEM_DIR/templates/"
    echo "✅ 已复制所有模板到 .agentmem/templates/ (供 AI 参考)"
    
    # 3.2 复制使用场景示例
    mkdir -p "$AGENTMEM_DIR/examples"
    if [ -d "$EXAMPLES_DIR" ]; then
        cp -r "$EXAMPLES_DIR/"* "$AGENTMEM_DIR/examples/"
        echo "✅ 已复制场景示例到 .agentmem/examples/ (供 AI 参考)"
    else
        echo "⚠️  未找到 examples 目录，跳过复制"
    fi

    # 3.3 复制最佳实践文档
    if [ -f "$DOCS_DIR/best-practices.md" ]; then
        cp "$DOCS_DIR/best-practices.md" "$AGENTMEM_DIR/docs/best-practices.md"
        echo "✅ 已复制最佳实践到 .agentmem/docs/best-practices.md"
    else
        echo "⚠️  未找到 best-practices.md，跳过复制"
    fi

    # 3.4 复制辅助脚本 (实现自包含)
    if [ -f "$SCRIPT_DIR/archive-task.sh" ] && [ -f "$SCRIPT_DIR/refresh-context.sh" ]; then
        cp "$SCRIPT_DIR/archive-task.sh" "$AGENTMEM_DIR/scripts/"
        cp "$SCRIPT_DIR/refresh-context.sh" "$AGENTMEM_DIR/scripts/"
        chmod +x "$AGENTMEM_DIR/scripts/"*.sh
        echo "✅ 已复制辅助脚本到 .agentmem/scripts/ (并赋予执行权限)"
    else
        echo "⚠️  未找到辅助脚本，跳过复制"
    fi
    
    # 完成
    echo ""
    echo "🎉 FlowMem 初始化完成！"
    echo ""
    echo "下一步："
    echo "1. 编辑 .agentmem/project.md 填入项目基本信息"
    echo "2. 开始你的第一个任务：创建 .agentmem/request.md"
}

# 辅助函数：初始化目录结构
init_directory_structure() {
    echo -e "${BLUE}正在创建目录结构...${NC}"
    
    mkdir -p "$AGENTMEM_DIR"
    mkdir -p "$AGENTMEM_DIR/docs"
    mkdir -p "$AGENTMEM_DIR/docs/modules"
    mkdir -p "$AGENTMEM_DIR/request_detail"
    mkdir -p "$AGENTMEM_DIR/history"
    mkdir -p "$AGENTMEM_DIR/scripts"

    echo -e "  ✓ 创建 $AGENTMEM_DIR/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/modules/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/modules/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/request_detail/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/history/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/scripts/"
    
    # 创建模板参考目录
    mkdir -p "$AGENTMEM_DIR/templates"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/templates/ (AI 参考用)"
    
    # 创建 .gitignore
    cat > "$AGENTMEM_DIR/.gitignore" << 'EOF'
# 建议忽略的文件
notes.md
request_detail/
history/

# 建议提交的文件
# project.md
# request.md (可选)
# todolist.md (可选)
# docs/
EOF
    echo -e "  ✓ 创建 .gitignore"
}

# 辅助函数：复制模板文件
copy_template() {
    local src_name="$1"
    local dest_path="$2"
    
    # 检查源模板是否存在
    if [ -f "$TEMPLATE_DIR/$src_name" ]; then
        if [ ! -f "$dest_path" ]; then
            cp "$TEMPLATE_DIR/$src_name" "$dest_path"
            echo -e "  ✓ 复制 $src_name 到 $dest_path"
        else
            echo -e "  ⚠️  $dest_path 已存在，跳过覆盖"
        fi
    else
        echo -e "  ⚠️  模板 $src_name 未包含在 templates/ 目录中，创建最小化版本..."
        echo "# [项目名称]" > "$dest_path"
        echo -e "  ✓ 创建基础版 $dest_path"
    fi
}

# 辅助函数：复制规则文件（带占位符替换）
copy_rule_file() {
    local src="$SCRIPT_DIR/../$1"
    local dest="$2"
    
    # 确保目标目录存在
    local dest_dir=$(dirname "$dest")
    if [ ! -d "$dest_dir" ]; then
        mkdir -p "$dest_dir"
    fi
    
    # 替换规则：
    # {{SETUP_SCRIPT}} -> .agentmem/scripts/setup.sh (实际上 setup script 是 init 脚本的变体，这里指向辅助脚本)
    # Init 模式下，辅助脚本在 .agentmem/scripts/
    # {{TEMPLATE_DIR}} -> .agentmem/templates
    # {{EXAMPLE_DIR}}  -> .agentmem/examples
    # {{SCRIPT_DIR}}   -> .agentmem/scripts
    # {{DOCS_DIR}}     -> .agentmem/docs
    
    local ASSETS_DIR=".agentmem"
    
    process_and_copy() {
        sed -e "s|{{SETUP_SCRIPT}}|${ASSETS_DIR}/scripts/setup.sh|g" \
            -e "s|{{TEMPLATE_DIR}}|${ASSETS_DIR}/templates|g" \
            -e "s|{{EXAMPLE_DIR}}|${ASSETS_DIR}/examples|g" \
            -e "s|{{SCRIPT_DIR}}|${ASSETS_DIR}/scripts|g" \
            -e "s|{{DOCS_DIR}}|${ASSETS_DIR}/docs|g" \
            "$src" > "$dest"
    }

    if [ -f "$dest" ]; then
        read -p "⚠️  文件 $dest 已存在，覆盖吗？(y/N) " overwrite
        if [[ $overwrite =~ ^[Yy]$ ]]; then
            process_and_copy
        else
            echo "已跳过 $dest"
        fi
    else
        process_and_copy
    fi
}

main "$@"
