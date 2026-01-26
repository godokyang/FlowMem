/**
 * flowmem archive 命令
 * 任务归档 - 将当前任务文件移动到 history/ 目录
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { getAgentmemPath, agentmemExists, ensureDir } from '../utils/file.js';

/**
 * 获取日期前缀
 */
function getDatePrefix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 获取时间戳
 */
function getTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${getDatePrefix()}_${hours}${minutes}${seconds}`;
}

/**
 * 移动文件
 */
function moveFile(src: string, dest: string): boolean {
  try {
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 移动目录
 */
function moveDir(src: string, dest: string): boolean {
  try {
    if (fs.existsSync(src) && fs.readdirSync(src).length > 0) {
      fs.renameSync(src, dest);
      // 重新创建空目录
      fs.mkdirSync(src, { recursive: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const archiveCommand = new Command('archive')
  .description('归档当前任务文件到 history/')
  .argument('[task-name]', '任务名称', 'task')
  .option('--dry-run', '仅显示将要归档的文件，不实际执行')
  .option('--json', '输出 JSON 格式')
  .action((taskName, options) => {
    if (!agentmemExists()) {
      console.error('❌ .agentmem 目录不存在。请先运行 flowmem init');
      process.exit(1);
    }

    const agentmemPath = getAgentmemPath();
    const historyDir = path.join(agentmemPath, 'history');
    const datePrefix = getDatePrefix();

    // 确保 history 目录存在
    ensureDir(historyDir);

    // 要归档的文件和目录
    const toArchive = [
      { type: 'file', src: 'request.md', dest: `${datePrefix}_request_${taskName}.md` },
      { type: 'file', src: 'todolist.md', dest: `${datePrefix}_todolist_${taskName}.md` },
      { type: 'file', src: 'notes.md', dest: `${datePrefix}_notes_${taskName}.md` },
      { type: 'file', src: 'analysis.md', dest: `${datePrefix}_analysis_${taskName}.md` },
      { type: 'file', src: 'plan.md', dest: `${datePrefix}_plan_${taskName}.md` },
      { type: 'file', src: 'review.md', dest: `${datePrefix}_review_${taskName}.md` },
      { type: 'dir', src: 'request_detail', dest: `${datePrefix}_request_detail_${taskName}` },
      { type: 'dir', src: 'task_logs', dest: `${datePrefix}_task_logs_${taskName}` },
      { type: 'dir', src: 'logs', dest: `${datePrefix}_logs_${taskName}` },
      { type: 'dir', src: 'implementation', dest: `${datePrefix}_implementation_${taskName}` }
    ];

    const archived: { src: string; dest: string }[] = [];
    const skipped: string[] = [];

    console.log('📦 任务归档\n');
    console.log(`任务名称: ${taskName}`);
    console.log(`时间戳: ${getTimestamp()}`);
    console.log('');

    for (const item of toArchive) {
      const srcPath = path.join(agentmemPath, item.src);
      const destPath = path.join(historyDir, item.dest);

      const exists = fs.existsSync(srcPath);
      const hasContent = exists && (
        item.type === 'file' ||
        (item.type === 'dir' && fs.readdirSync(srcPath).length > 0)
      );

      if (hasContent) {
        if (options.dryRun) {
          console.log(`  [DRY-RUN] ${item.src} → history/${item.dest}`);
          archived.push({ src: item.src, dest: item.dest });
        } else {
          const success = item.type === 'file'
            ? moveFile(srcPath, destPath)
            : moveDir(srcPath, destPath);

          if (success) {
            console.log(`  ✅ ${item.src} → history/${item.dest}`);
            archived.push({ src: item.src, dest: item.dest });
          } else {
            console.log(`  ❌ 归档失败: ${item.src}`);
          }
        }
      } else {
        skipped.push(item.src);
      }
    }

    // 清理 session.json (重置状态)
    const sessionPath = path.join(agentmemPath, 'session.json');
    if (fs.existsSync(sessionPath) && !options.dryRun) {
      const sessionContent = {
        session_id: `SESSION-${Date.now().toString(36).toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_phase: 0,
        current_todo_id: null,
        retry_count: 0,
        status: 'active',
        checkpoints: []
      };
      fs.writeFileSync(sessionPath, JSON.stringify(sessionContent, null, 2));
      console.log('  ✅ 重置 session.json');
    }

    console.log('');

    if (options.json) {
      console.log(JSON.stringify({
        taskName,
        timestamp: getTimestamp(),
        archived,
        skipped,
        dryRun: options.dryRun || false
      }, null, 2));
      return;
    }

    console.log('─'.repeat(40));
    console.log(`归档完成: ${archived.length} 个文件/目录`);
    console.log(`跳过: ${skipped.length} 个 (不存在或为空)`);
    console.log(`归档位置: .agentmem/history/`);

    if (archived.length > 0) {
      console.log('\n归档内容:');
      for (const item of archived) {
        console.log(`  - ${item.dest}`);
      }
    }
  });
