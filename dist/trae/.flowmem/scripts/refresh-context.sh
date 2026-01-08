#!/bin/bash
# ============================================================================
# refresh-context.sh - 上下文刷新辅助脚本 (AI 专用)
# ============================================================================
# 用法: ./refresh-context.sh [项目目录] [模式]
#
# 此脚本设计由 AI Agent 调用 (通过 run_command)，
# 用于一次性读取核心上下文文件，减少 Token 消耗。
# 模式:
#   full    - 完整输出 (默认)
#   summary - 摘要模式
#   todo    - 仅输出当前 Todo
# ============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 参数处理
TARGET_DIR="${1:-.}"
MODE="${2:-full}"

# 检查目标目录
if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 目录 $TARGET_DIR 不存在"
    exit 1
fi

cd "$TARGET_DIR"
AGENTMEM_DIR=".agentmem"

if [ ! -d "$AGENTMEM_DIR" ]; then
    echo "错误: $AGENTMEM_DIR 目录不存在"
    exit 1
fi

# 分隔线函数
separator() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 摘要函数 - 提取文件前 N 行
summary_lines() {
    local file="$1"
    local lines="${2:-20}"
    if [ -f "$file" ]; then
        head -n "$lines" "$file"
        local total=$(wc -l < "$file")
        if [ "$total" -gt "$lines" ]; then
            echo -e "\n${YELLOW}... 还有 $((total - lines)) 行 (共 $total 行)${NC}"
        fi
    fi
}

# 提取当前 Todo
extract_current_todo() {
    local file="$1"
    if [ -f "$file" ]; then
        # 查找标记为进行中的 Todo
        grep -E "^\s*-\s*\[/\]" "$file" 2>/dev/null || echo "无进行中的 Todo"
        echo ""
        # 查找下一个未完成的 Todo
        echo -e "${CYAN}下一个待办:${NC}"
        grep -E "^\s*-\s*\[\s\]" "$file" 2>/dev/null | head -n 1 || echo "无待办事项"
    fi
}

echo ""
separator
echo -e "${GREEN}  上下文刷新 - 模式: $MODE${NC}"
separator
echo ""

case $MODE in
    todo)
        # 仅输出当前 Todo
        if [ -f "$AGENTMEM_DIR/todolist.md" ]; then
            echo -e "${CYAN}【当前任务】${NC}"
            extract_current_todo "$AGENTMEM_DIR/todolist.md"
        else
            echo "todolist.md 不存在"
        fi
        ;;
        
    summary)
        # 摘要模式
        echo -e "${CYAN}【1. 当前 Todo】${NC}"
        if [ -f "$AGENTMEM_DIR/todolist.md" ]; then
            extract_current_todo "$AGENTMEM_DIR/todolist.md"
        else
            echo "todolist.md 不存在"
        fi
        
        echo ""
        separator
        
        echo -e "${CYAN}【2. 需求摘要】${NC}"
        if [ -f "$AGENTMEM_DIR/request.md" ]; then
            # 提取需求理解部分
            sed -n '/## 需求理解/,/## 状态/p' "$AGENTMEM_DIR/request.md" 2>/dev/null | head -n 20 || summary_lines "$AGENTMEM_DIR/request.md" 15
        else
            echo "request.md 不存在"
        fi
        
        echo ""
        separator
        
        echo -e "${CYAN}【3. 项目概览】${NC}"
        if [ -f "$AGENTMEM_DIR/project.md" ]; then
            summary_lines "$AGENTMEM_DIR/project.md" 30
        else
            echo "project.md 不存在"
        fi
        ;;
        
    full|*)
        # 完整模式
        echo -e "${CYAN}【1. todolist.md】${NC}"
        if [ -f "$AGENTMEM_DIR/todolist.md" ]; then
            cat "$AGENTMEM_DIR/todolist.md"
        else
            echo "文件不存在"
        fi
        
        echo ""
        separator
        
        echo -e "${CYAN}【2. request.md】${NC}"
        if [ -f "$AGENTMEM_DIR/request.md" ]; then
            cat "$AGENTMEM_DIR/request.md"
        else
            echo "文件不存在"
        fi
        
        echo ""
        separator
        
        echo -e "${CYAN}【3. project.md】${NC}"
        if [ -f "$AGENTMEM_DIR/project.md" ]; then
            cat "$AGENTMEM_DIR/project.md"
        else
            echo "文件不存在"
        fi
        ;;
esac

echo ""
separator
echo -e "${GREEN}  刷新完成${NC}"
separator
echo ""
