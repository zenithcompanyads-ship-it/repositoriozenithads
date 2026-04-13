'use client';

import { useState } from 'react';
import { Check, Edit2, Trash2, MessageCircle } from 'lucide-react';
import TaskComments from './TaskComments';
import type { Task } from '@/lib/tasks';

interface TaskItemProps {
  task: Task;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TaskItem({ task, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  const [showComments, setShowComments] = useState(false);
  const isCompleted = task.status === 'completed';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'normal':
        return 'bg-gray-100 text-gray-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Progresso';
      case 'completed':
        return 'Completo';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <>
      <div className={`bg-white rounded-xl border ${isCompleted ? 'border-gray-200' : 'border-gray-100'} shadow-xs hover:shadow-sm transition-all overflow-hidden`}>
        {/* Main Row */}
        <div className="p-4 sm:p-5 flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={onToggleComplete}
            className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all mt-1 ${
              isCompleted
                ? 'bg-green-600 border-green-600'
                : 'border-gray-300 hover:border-green-600'
            }`}
          >
            {isCompleted && <Check size={16} className="text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                {task.description}
              </p>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              {/* Status */}
              <span className={`px-2.5 py-1 rounded-full font-semibold ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>

              {/* Priority */}
              <span className={`px-2.5 py-1 rounded-full font-semibold ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)}
              </span>

              {/* Due Date */}
              {task.due_date && (
                <span className={`${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {isOverdue ? '🔴 ' : '📅 '}
                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowComments(!showComments)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Ver comentários"
            >
              <MessageCircle size={18} />
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Deletar"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && <TaskComments taskId={task.id} />}
      </div>
    </>
  );
}
