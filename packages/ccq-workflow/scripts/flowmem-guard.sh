#!/bin/bash
# ============================================================================
# flowmem-guard.sh - FlowMem 写入拦截与质量门禁 CLI (v2.8)
# ============================================================================
# 用于 Claude Code Hooks，实现 AI 行为约束
#
# 命令:
#   flowmem-guard.sh check-protected <path>  # 检查是否为保护文件
#   flowmem-guard.sh check-risk <path>       # 检查高风险路径
#   flowmem-guard.sh log-change <path> <tool> # 记录变更到 trace.jsonl
#   flowmem-guard.sh check-core-mem          # 检查核心记忆文件是否存在
#   flowmem-guard.sh check-todo-align <path> # 检查变更是否与当前 todo 对齐
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 配置
AGENTMEM_DIR=".agentmem"
PROJECT_CONFIG="$AGENTMEM_DIR/project.md"
TRACE_LOG="$AGENTMEM_DIR/logs/trace.jsonl"
REVIEWER_APPROVED="$AGENTMEM_DIR/.reviewer_approved"

# 默认保护文件列表
DEFAULT_PROTECTED_FILES=(
    ".agentmem/request.md"
    ".agentmem/todolist.md"
    ".agentmem/project.md"
)

# 默认高风险路径列表
DEFAULT_HIGH_RISK_PATHS=(
    "auth/"
    "security/"
    "migrations/"
    "db/"
    "infra/"
    "config/"
    ".github/workflows/"
    ".env"
)

# ============================================================================
# 辅助函数
# ============================================================================

# 获取当前时间戳 (ISO 8601)
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# 从 project.md 读取高风险路径配置
get_high_risk_paths() {
    if [ -f "$PROJECT_CONFIG" ]; then
        # 尝试从 YAML frontmatter 中提取 high_paths
        # 简化实现：使用 grep 和 sed
        local paths=$(grep -A 20 "high_paths:" "$PROJECT_CONFIG" 2>/dev/null | grep "^\s*-" | sed 's/^\s*-\s*"\?\([^"]*\)"\?/\1/' | head -20)
        if [ -n "$paths" ]; then
            echo "$paths"
            return
        fi
    fi
    # 返回默认值
    printf '%s\n' "${DEFAULT_HIGH_RISK_PATHS[@]}"
}

# 检查路径是否匹配模式
path_matches() {
    local path="$1"
    local pattern="$2"

    # 支持通配符匹配
    if [[ "$path" == *"$pattern"* ]]; then
        return 0
    fi
    return 1
}

# ============================================================================
# 命令实现
# ============================================================================

# 检查是否为保护文件
cmd_check_protected() {
    local path="$1"

    if [ -z "$path" ]; then
        echo -e "${RED}错误: 缺少路径参数${NC}"
        exit 1
    fi

    for protected in "${DEFAULT_PROTECTED_FILES[@]}"; do
        if path_matches "$path" "$protected"; then
            echo -e "${RED}BLOCKED: 保护文件 $protected 禁止直接修改${NC}"
            echo "请通过 Orchestrator 更新，或使用 flowmem todo CLI 操作 todolist.md"
            exit 1
        fi
    done

    echo -e "${GREEN}PASS: $path 不是保护文件${NC}"
    exit 0
}

# 检查高风险路径
cmd_check_risk() {
    local path="$1"

    if [ -z "$path" ]; then
        echo -e "${RED}错误: 缺少路径参数${NC}"
        exit 1
    fi

    # 获取高风险路径列表
    local high_risk_paths
    high_risk_paths=$(get_high_risk_paths)

    for risk_path in $high_risk_paths; do
        if path_matches "$path" "$risk_path"; then
            # 检查是否有 Reviewer 通过标记
            if [ -f "$REVIEWER_APPROVED" ]; then
                echo -e "${GREEN}PASS: 高风险路径 $risk_path 已有 Reviewer 审核通过${NC}"
                exit 0
            else
                echo -e "${RED}BLOCKED: 高风险路径 $risk_path 需要 Reviewer 审核通过${NC}"
                echo "请先完成 Reviewer 审核，或在 project.md 中调整 high_paths 配置"
                exit 1
            fi
        fi
    done

    echo -e "${GREEN}PASS: $path 不是高风险路径${NC}"
    exit 0
}

# 记录变更到 trace.jsonl
cmd_log_change() {
    local path="$1"
    local tool="$2"

    if [ -z "$path" ] || [ -z "$tool" ]; then
        echo -e "${YELLOW}警告: 缺少参数，跳过日志记录${NC}"
        exit 0
    fi

    # 确保日志目录存在
    mkdir -p "$(dirname "$TRACE_LOG")"

    # 获取当前 todo（如果存在）
    local current_todo=""
    if [ -f "$AGENTMEM_DIR/todolist.md" ]; then
        # 简化实现：查找 in_progress 状态的 todo
        current_todo=$(grep -o 'TODO-[0-9]*' "$AGENTMEM_DIR/todolist.md" | head -1 || echo "")
    fi

    # 写入日志
    local timestamp=$(get_timestamp)
    local log_entry="{\"timestamp\":\"$timestamp\",\"tool\":\"$tool\",\"path\":\"$path\",\"todo\":\"$current_todo\"}"
    echo "$log_entry" >> "$TRACE_LOG"

    echo -e "${GREEN}已记录变更: $path ($tool)${NC}"
    exit 0
}

# 检查核心记忆文件是否存在
cmd_check_core_mem() {
    local missing=()

    # 检查 request.md 或 todolist.md 是否存在
    # 注意：不是所有任务都需要这些文件，只在四阶段工作流中需要

    if [ ! -d "$AGENTMEM_DIR" ]; then
        echo -e "${YELLOW}警告: .agentmem 目录不存在${NC}"
        echo "如需使用四阶段工作流，请先运行 flowmem init"
        exit 0  # 不阻塞，只警告
    fi

    # 检查是否在任务进行中
    if [ -f "$AGENTMEM_DIR/request.md" ] || [ -f "$AGENTMEM_DIR/todolist.md" ]; then
        # 任务进行中，检查必要文件
        if [ ! -f "$AGENTMEM_DIR/request.md" ]; then
            missing+=("request.md")
        fi
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${YELLOW}警告: 缺少核心记忆文件: ${missing[*]}${NC}"
        echo "建议先完成需求澄清阶段"
        exit 0  # 不阻塞，只警告
    fi

    echo -e "${GREEN}PASS: 核心记忆文件检查通过${NC}"
    exit 0
}

# 检查变更是否与当前 todo 对齐
cmd_check_todo_align() {
    local path="$1"

    if [ -z "$path" ]; then
        echo -e "${RED}错误: 缺少路径参数${NC}"
        exit 1
    fi

    # 如果没有 todolist.md，跳过检查
    if [ ! -f "$AGENTMEM_DIR/todolist.md" ]; then
        echo -e "${GREEN}PASS: 无 todolist.md，跳过对齐检查${NC}"
        exit 0
    fi

    # 查找当前进行中的 todo
    local current_todo=$(grep -B 5 'status: "in_progress"' "$AGENTMEM_DIR/todolist.md" 2>/dev/null | grep -o 'TODO-[0-9]*' | head -1 || echo "")

    if [ -z "$current_todo" ]; then
        echo -e "${YELLOW}警告: 没有进行中的 todo，但正在修改文件${NC}"
        echo "建议先将对应 todo 标记为 in_progress"
        exit 0  # 不阻塞，只警告
    fi

    # 检查当前 todo 的 files 列表是否包含此路径
    # 简化实现：只输出警告，不阻塞
    echo -e "${GREEN}PASS: 当前 todo: $current_todo${NC}"
    exit 0
}

# ============================================================================
# 主入口
# ============================================================================

main() {
    local cmd="$1"
    shift || true

    case "$cmd" in
        check-protected)
            cmd_check_protected "$@"
            ;;
        check-risk)
            cmd_check_risk "$@"
            ;;
        log-change)
            cmd_log_change "$@"
            ;;
        check-core-mem)
            cmd_check_core_mem "$@"
            ;;
        check-todo-align)
            cmd_check_todo_align "$@"
            ;;
        help|--help|-h)
            echo "FlowMem Guard CLI v2.8"
            echo ""
            echo "用法: flowmem-guard.sh <command> [args]"
            echo ""
            echo "命令:"
            echo "  check-protected <path>   检查是否为保护文件"
            echo "  check-risk <path>        检查高风险路径"
            echo "  log-change <path> <tool> 记录变更到 trace.jsonl"
            echo "  check-core-mem           检查核心记忆文件是否存在"
            echo "  check-todo-align <path>  检查变更是否与当前 todo 对齐"
            echo ""
            echo "退出码:"
            echo "  0 - 通过/允许"
            echo "  1 - 拦截/拒绝"
            exit 0
            ;;
        *)
            echo -e "${RED}错误: 未知命令 '$cmd'${NC}"
            echo "使用 'flowmem-guard.sh help' 查看帮助"
            exit 1
            ;;
    esac
}

main "$@"
