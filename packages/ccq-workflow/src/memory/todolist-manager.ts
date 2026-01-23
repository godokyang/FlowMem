/**
 * TodoList 管理器
 *
 * 负责 TodoList 的状态更新、依赖检查和进度跟踪
 */

import { TodoList, TodoItem } from '../agents/types';

export class TodoListManager {
  private todoList: TodoList | null = null;

  constructor(initialTodoList?: TodoList) {
    if (initialTodoList) {
      this.todoList = JSON.parse(JSON.stringify(initialTodoList));
    }
  }

  /**
   * 设置 TodoList
   */
  setTodoList(todoList: TodoList): void {
    this.todoList = JSON.parse(JSON.stringify(todoList));
  }

  /**
   * 获取 TodoList
   */
  getTodoList(): TodoList | null {
    return this.todoList ? JSON.parse(JSON.stringify(this.todoList)) : null;
  }

  /**
   * 更新 Todo 状态
   */
  updateStatus(todoId: string, status: TodoItem['status']): void {
    if (!this.todoList) return;

    const todo = this.todoList.todos.find(t => t.id === todoId);
    if (todo) {
      todo.status = status;
    }
  }

  /**
   * 获取下一个可执行的 Todo
   */
  getNextExecutableTodo(): TodoItem | null {
    if (!this.todoList) return null;

    for (const layer of this.todoList.executionOrder) {
      for (const todoId of layer) {
        const todo = this.todoList.todos.find(t => t.id === todoId);
        
        if (todo && todo.status === 'pending') {
          // 检查依赖
          const depsMet = todo.dependsOn.every(depId => {
            const depTodo = this.todoList!.todos.find(t => t.id === depId);
            return depTodo && depTodo.status === 'completed';
          });

          if (depsMet) {
            return JSON.parse(JSON.stringify(todo));
          }
        }
      }
    }

    return null;
  }

  /**
   * 获取进度统计
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    if (!this.todoList) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const total = this.todoList.todos.length;
    const completed = this.todoList.todos.filter(t => t.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  /**
   * 检查所有任务是否完成
   */
  isAllCompleted(): boolean {
    if (!this.todoList) return false;
    return this.todoList.todos.every(t => t.status === 'completed');
  }
}
