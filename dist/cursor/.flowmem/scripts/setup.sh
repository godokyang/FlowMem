#!/bin/bash
# ============================================================================
# setup.sh - FlowMem AI 运行时初始化脚本
# ============================================================================
# 用法: ./setup.sh
# 此脚本由 AI Agent 在接手新项目或环境重置时调用。
# 它根据 .flowmem (或 .claude/skills/flowmem) 中的模板，
# 初始化 .agentmem 运行时目录。
# ============================================================================

set -e

# 定位静态资源目录 (Templates & Scripts)
# 优先级: 环境变量 -> 当前目录 .flowmem -> .claude/skills/flowmem -> 脚本所在目录的父目录
if [ -n "$FLOWMEM_SRC_DIR" ]; then
    SRC_DIR="$FLOWMEM_SRC_DIR"
elif [ -d ".flowmem" ]; then
    SRC_DIR=".flowmem"
elif [ -d ".claude/skills/flowmem" ]; then
    SRC_DIR=".claude/skills/flowmem"
else
    # 回退到脚本所在目录 (兼容直接复制 setup.sh 的情况)
    SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# 定义运行时目录
AGENTMEM_DIR=".agentmem"

echo "FlowMem Setup: 初始化运行时记忆..."
echo "  源目录: $SRC_DIR"
echo "  目标目录: $AGENTMEM_DIR"

# 1. 创建目录结构
mkdir -p "$AGENTMEM_DIR/docs/modules"
mkdir -p "$AGENTMEM_DIR/request_detail"
mkdir -p "$AGENTMEM_DIR/history"
mkdir -p "$AGENTMEM_DIR/scripts"

# 2. 复制项目配置模板 (project.md)
if [ ! -f "$AGENTMEM_DIR/project.md" ]; then
    if [ -f "$SRC_DIR/templates/project.md" ]; then
        cp "$SRC_DIR/templates/project.md" "$AGENTMEM_DIR/project.md"
        echo "  ✓ 初始化 project.md"
    else
        echo "# [项目名称]" > "$AGENTMEM_DIR/project.md"
        echo "  ✓ 创建基础版 project.md"
    fi
else
    echo "  - project.md 已存在，跳过"
fi

# 3. 复制工具脚本 (archive/refresh) 到运行时目录
#    注意：虽然 adapter 包里有这些脚本，但复制到 runtime 目录更方便 user/rule 调用标准化路径
if [ -d "$SRC_DIR/scripts" ]; then
    cp "$SRC_DIR/scripts/"*.sh "$AGENTMEM_DIR/scripts/" 2>/dev/null || true
    chmod +x "$AGENTMEM_DIR/scripts/"*.sh
    echo "  ✓ 部署辅助工具到 $AGENTMEM_DIR/scripts/"
fi

# 4. 复制模板目录 (供 AI 参考)
if [ -d "$SRC_DIR/templates" ]; then
    mkdir -p "$AGENTMEM_DIR/templates"
    cp -r "$SRC_DIR/templates/"* "$AGENTMEM_DIR/templates/" 2>/dev/null || true
    echo "  ✓ 复制模板到 $AGENTMEM_DIR/templates/"
fi

# 5. 复制示例目录 (供 AI 参考)
if [ -d "$SRC_DIR/examples" ]; then
    mkdir -p "$AGENTMEM_DIR/examples"
    cp -r "$SRC_DIR/examples/"* "$AGENTMEM_DIR/examples/" 2>/dev/null || true
    echo "  ✓ 复制示例到 $AGENTMEM_DIR/examples/"
fi

# 6. 复制文档目录 (供 AI 参考)
if [ -d "$SRC_DIR/docs" ]; then
    mkdir -p "$AGENTMEM_DIR/docs"
    cp -r "$SRC_DIR/docs/"* "$AGENTMEM_DIR/docs/" 2>/dev/null || true
    echo "  ✓ 复制文档到 $AGENTMEM_DIR/docs/"
fi

# 7. 创建 .gitignore
if [ ! -f "$AGENTMEM_DIR/.gitignore" ]; then
    cat > "$AGENTMEM_DIR/.gitignore" << 'EOF'
notes.md
request_detail/
history/
EOF
    echo "  ✓ 创建 .gitignore"
fi

echo "✅ 初始化完成。请开始阅读 .agentmem/project.md。"
