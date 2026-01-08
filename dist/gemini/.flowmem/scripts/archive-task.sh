#!/bin/bash
# ============================================================================
# archive-task.sh - 任务归档脚本 (AI 专用)
# ============================================================================
# 用法: ./archive-task.sh [项目目录] [任务名称]
#
# 此脚本设计由 AI Agent 在任务完成时自动调用。
# 它会将当前任务文件移动到 history/ 目录，包括 notes.md。
# ============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 参数处理
TARGET_DIR="${1:-.}"
TASK_NAME="${2:-task}"

# 生成时间戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_PREFIX=$(date +"%Y%m%d")

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  任务归档${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 检查目标目录
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}错误: 目录 $TARGET_DIR 不存在${NC}"
    exit 1
fi

cd "$TARGET_DIR"
TARGET_DIR=$(pwd)

AGENTMEM_DIR=".agentmem"
HISTORY_DIR="$AGENTMEM_DIR/history"

# 检查 .agentmem 目录
if [ ! -d "$AGENTMEM_DIR" ]; then
    echo -e "${RED}错误: $AGENTMEM_DIR 目录不存在${NC}"
    exit 1
fi

# 创建历史目录
mkdir -p "$HISTORY_DIR"

echo -e "目标目录: ${GREEN}$TARGET_DIR${NC}"
echo -e "任务名称: ${GREEN}$TASK_NAME${NC}"
echo -e "时间戳: ${GREEN}$TIMESTAMP${NC}"
echo ""

# 归档计数
ARCHIVED=0

# 归档 request.md
if [ -f "$AGENTMEM_DIR/request.md" ]; then
    ARCHIVE_NAME="${DATE_PREFIX}_request_${TASK_NAME}.md"
    mv "$AGENTMEM_DIR/request.md" "$HISTORY_DIR/$ARCHIVE_NAME"
    echo -e "  ✓ 归档 request.md → history/$ARCHIVE_NAME"
    ((ARCHIVED++))
fi

# 归档 request_detail 目录
if [ -d "$AGENTMEM_DIR/request_detail" ] && [ "$(ls -A $AGENTMEM_DIR/request_detail 2>/dev/null)" ]; then
    ARCHIVE_DIR="${DATE_PREFIX}_request_detail_${TASK_NAME}"
    mv "$AGENTMEM_DIR/request_detail" "$HISTORY_DIR/$ARCHIVE_DIR"
    mkdir -p "$AGENTMEM_DIR/request_detail"  # 重新创建空目录
    echo -e "  ✓ 归档 request_detail/ → history/$ARCHIVE_DIR/"
    ((ARCHIVED++))
fi

# 归档 todolist.md
if [ -f "$AGENTMEM_DIR/todolist.md" ]; then
    ARCHIVE_NAME="${DATE_PREFIX}_todolist_${TASK_NAME}.md"
    mv "$AGENTMEM_DIR/todolist.md" "$HISTORY_DIR/$ARCHIVE_NAME"
    echo -e "  ✓ 归档 todolist.md → history/$ARCHIVE_NAME"
    ((ARCHIVED++))
fi

# 归档 notes.md (默认归档，不删除)
if [ -f "$AGENTMEM_DIR/notes.md" ]; then
    ARCHIVE_NAME="${DATE_PREFIX}_notes_${TASK_NAME}.md"
    mv "$AGENTMEM_DIR/notes.md" "$HISTORY_DIR/$ARCHIVE_NAME"
    echo -e "  ✓ 归档 notes.md → history/$ARCHIVE_NAME"
    ((ARCHIVED++))
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  归档完成!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "已归档 ${GREEN}$ARCHIVED${NC} 个文件/目录"
echo ""
echo -e "归档位置: ${GREEN}$HISTORY_DIR/${NC}"
echo ""

# 列出归档的文件
if [ $ARCHIVED -gt 0 ]; then
    echo -e "归档内容:"
    ls -la "$HISTORY_DIR" | grep "$DATE_PREFIX" | awk '{print "  " $NF}'
fi
echo ""
