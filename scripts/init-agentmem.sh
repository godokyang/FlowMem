#!/bin/bash
# ============================================================================
# init-agentmem.sh - AI 上下文记忆系统初始化脚本
# ============================================================================
# 用法: ./init-agentmem.sh [项目目录]
# 如果不指定目录，则在当前目录初始化
# ============================================================================

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

# 创建 .agentmem 目录结构
AGENTMEM_DIR=".agentmem"

if [ -d "$AGENTMEM_DIR" ]; then
    echo -e "${YELLOW}警告: $AGENTMEM_DIR 目录已存在${NC}"
    read -p "是否覆盖? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消初始化"
        exit 0
    fi
fi

echo -e "${BLUE}正在创建目录结构...${NC}"

# 创建目录
mkdir -p "$AGENTMEM_DIR"
mkdir -p "$AGENTMEM_DIR/docs"
mkdir -p "$AGENTMEM_DIR/docs/modules"
mkdir -p "$AGENTMEM_DIR/request_detail"
mkdir -p "$AGENTMEM_DIR/history"

echo -e "  ✓ 创建 $AGENTMEM_DIR/"
echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/"
echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/modules/"
# 主逻辑
main() {
    # 1. 初始化目录结构
    init_directory_structure

    echo ""
    echo "clipboard: 选择你的 AI 助手/编辑器："
    echo "1) Claude Code (动态生成 Skill)"
    echo "2) Cursor"
    echo "3) Windsurf"
    echo "4) Trae"
    echo "5) Cline (Roo)"
    echo "6) Antigravity (Gemini)"
    echo "7) VS Code Copilot"
    echo "8) 其他 (仅复制通用规则)"
    
    read -p "请输入序号 (1-8) [1]: " tool_choice
    tool_choice=${tool_choice:-1}

    # 2. 复制规则文件
    case $tool_choice in
        1)
            # 动态生成 Claude Skill
            mkdir -p .claude/skills/context-memory
            local dest=".claude/skills/context-memory/SKILL.md"
            echo "---" > "$dest"
            echo "name: context-memory-system" >> "$dest"
            echo "description: 使用持久化 Markdown 文件管理 AI 工作记忆。在开始复杂任务、多步骤项目时自动激活。" >> "$dest"
            echo "---" >> "$dest"
            echo "" >> "$dest"
            cat "$SCRIPT_DIR/../adapters/common-rules.md" >> "$dest"
            echo "✅ 已生成 Claude Code Skill: $dest"
            ;;
        2)
            copy_rule_file "adapters/common-rules.md" ".cursorrules"
            echo "✅ 已配置 Cursor 规则 (.cursorrules)"
            ;;
        3)
            copy_rule_file "adapters/common-rules.md" ".windsurfrules"
            echo "✅ 已配置 Windsurf 规则 (.windsurfrules)"
            ;;
        4)
            mkdir -p .trae/rules
            copy_rule_file "adapters/common-rules.md" ".trae/rules/context-memory.md"
            echo "✅ 已配置 Trae 规则 (.trae/rules/context-memory.md)"
            ;;
        5)
            copy_rule_file "adapters/common-rules.md" ".clinerules"
            echo "✅ 已配置 Cline 规则 (.clinerules)"
            ;;
        6)
            # 尝试复制到用户根目录或项目目录
            echo "配置 Gemini 规则..."
            echo "建议手动将 rules.md 内容添加到你的 system instructions 中"
            copy_rule_file "adapters/common-rules.md" "gemini-rules.md"
            echo "✅ 已在项目根目录创建 gemini-rules.md"
            ;;
        7)
            mkdir -p .github
            copy_rule_file "adapters/common-rules.md" ".github/copilot-instructions.md"
            echo "✅ 已配置 Copilot 规则 (.github/copilot-instructions.md)"
            ;;
        *)
            copy_rule_file "adapters/common-rules.md" "agentmem-rules.md"
            echo "✅ 已复制通用规则到 agentmem-rules.md"
            ;;
    esac

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

    echo -e "  ✓ 创建 $AGENTMEM_DIR/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/modules/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/docs/modules/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/request_detail/"
    echo -e "  ✓ 创建 $AGENTMEM_DIR/history/"
    
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

# 辅助函数：复制规则文件
copy_rule_file() {
    local src="$SCRIPT_DIR/../$1"
    local dest="$2"
    
    # 确保目标目录存在
    local dest_dir=$(dirname "$dest")
    if [ ! -d "$dest_dir" ]; then
        mkdir -p "$dest_dir"
    fi
    
    if [ -f "$dest" ]; then
        read -p "⚠️  文件 $dest 已存在，覆盖吗？(y/N) " overwrite
        if [[ $overwrite =~ ^[Yy]$ ]]; then
            cp "$src" "$dest"
        else
            echo "已跳过 $dest"
        fi
    else
        cp "$src" "$dest"
    fi
}

main "$@"
