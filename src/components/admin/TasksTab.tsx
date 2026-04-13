'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getClientTasks, createTask as createTaskLib, updateTask, deleteTask as deleteTaskLib } from '@/lib/tasks';
import { CheckSquare2, Plus, Trash2, Edit2 } from 'lucide-react';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';
import type { Task } from '@/lib/tasks';

interface TasksTabProps {
  clientId: string;
  userId: string;
}

export default function TasksTab({ clientId, userId }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const tasksData = await getClientTasks(supabase, clientId);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'client_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    try {
      const supabase = createClient();
      const newTask = await createTaskLib(supabase, clientId, userId, taskData);
      setTasks([newTask, ...tasks]);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const supabase = createClient();
      const updatedTask = await updateTask(supabase, taskId, updates);
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      const supabase = createClient();
      await deleteTaskLib(supabase, taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await handleUpdateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando tarefas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare2 size={20} />
            Tarefas
          </h3>
          <p className="text-sm text-gray-500 mt-1">Organize e acompanhe todas as tarefas deste cliente</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Adicionar Tarefa
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <TaskForm
          clientId={clientId}
          onSubmit={handleCreateTask}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit Form Modal */}
      {editingTask && (
        <TaskForm
          clientId={clientId}
          task={editingTask}
          onSubmit={(data) => handleUpdateTask(editingTask.id, data)}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-12 text-center">
          <p className="text-gray-500 font-light">Nenhuma tarefa criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={() => handleToggleComplete(task)}
              onEdit={() => setEditingTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
