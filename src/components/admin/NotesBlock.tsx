'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
} from '@/lib/notes';
import { Plus, Trash2, X, Check, AlertCircle } from 'lucide-react';
import type { Note, NotePriority, NoteTheme, Subtask } from '@/lib/notes';

// Theme configurations
const THEMES: Record<NoteTheme, { bg: string; text: string; border: string }> = {
  default: { bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
  dark: { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
  gold: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  coral: { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200' },
  slate: { bg: 'bg-gray-800', text: 'text-gray-100', border: 'border-gray-600' },
};

const PRIORITY_COLORS: Record<NotePriority, string> = {
  low: 'bg-green-100 text-green-700',
  normal: 'bg-gray-100 text-gray-700',
  high: 'bg-red-100 text-red-700',
};

const THEME_OPTIONS: NoteTheme[] = ['default', 'dark', 'blue', 'green', 'purple', 'gold', 'coral', 'slate'];
const PRIORITY_OPTIONS: NotePriority[] = ['low', 'normal', 'high'];

export default function NotesBlock() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NotePriority>('normal');
  const [theme, setTheme] = useState<NoteTheme>('default');
  const [submitting, setSubmitting] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    getUser();
  }, []);

  // Load notes
  const loadNotes = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const supabase = createClient();
      const notesData = await getNotes(supabase, userId);
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Handle save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    setSubmitting(true);
    try {
      const supabase = createClient();

      if (editingNote) {
        await updateNote(supabase, editingNote.id, {
          title: title.trim(),
          content: content.trim() || undefined,
          priority,
          theme,
        });
      } else {
        await createNote(supabase, userId, {
          title: title.trim(),
          content: content.trim() || undefined,
          priority,
          theme,
          subtasks: [],
        });
      }

      // Reset form
      setTitle('');
      setContent('');
      setPriority('normal');
      setTheme('default');
      setEditingNote(null);
      setShowForm(false);

      // Reload notes
      await loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja deletar essa nota?')) return;

    try {
      const supabase = createClient();
      await deleteNote(supabase, noteId);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Handle edit
  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setPriority(note.priority);
    setTheme(note.theme);
    setShowForm(true);
  };

  // Handle close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setPriority('normal');
    setTheme('default');
  };

  // Handle add subtask
  const handleAddSubtask = async (noteId: string, text: string) => {
    if (!text.trim()) return;

    try {
      const supabase = createClient();
      await addSubtask(supabase, noteId, text.trim());
      await loadNotes();
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };

  // Handle toggle subtask
  const handleToggleSubtask = async (noteId: string, subtaskId: string, done: boolean) => {
    try {
      const supabase = createClient();
      await toggleSubtask(supabase, noteId, subtaskId, !done);
      await loadNotes();
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  // Handle delete subtask
  const handleDeleteSubtask = async (noteId: string, subtaskId: string) => {
    try {
      const supabase = createClient();
      await deleteSubtask(supabase, noteId, subtaskId);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Minhas Notas</h2>
          <p className="text-sm text-gray-500 mt-1">Organize suas ideias com cores, prioridades e subtarefas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Nova Nota
        </button>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Carregando notas...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <AlertCircle size={40} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4 font-medium">Nenhuma nota ainda</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            Criar primeira nota →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const themeConfig = THEMES[note.theme];
            const subtaskCount = note.subtasks?.length || 0;
            const completedCount = note.subtasks?.filter(s => s.done).length || 0;

            return (
              <div
                key={note.id}
                className={`${themeConfig.bg} ${themeConfig.text} rounded-lg border ${themeConfig.border} p-4 shadow-md hover:shadow-lg transition-all`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-lg break-words cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleEdit(note)}
                    >
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[note.priority]}`}>
                        {note.priority === 'high' ? '🔴 Alta' : note.priority === 'low' ? '🟢 Baixa' : '⚪ Normal'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                      themeConfig.bg === 'bg-white'
                        ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                    }`}
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Content */}
                {note.content && (
                  <p className={`text-sm ${themeConfig.text} opacity-80 mb-3 line-clamp-3`}>
                    {note.content}
                  </p>
                )}

                {/* Subtasks */}
                {subtaskCount > 0 && (
                  <div className="mb-3 pb-3 border-t border-current border-opacity-20">
                    <p className="text-xs font-semibold opacity-70 mb-2">
                      Subtarefas ({completedCount}/{subtaskCount})
                    </p>
                    <div className="space-y-1">
                      {note.subtasks?.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2 text-sm">
                          <button
                            onClick={() => handleToggleSubtask(note.id, subtask.id, subtask.done)}
                            className={`flex-shrink-0 w-4 h-4 rounded border transition-all ${
                              subtask.done
                                ? 'bg-green-500 border-green-500'
                                : themeConfig.bg === 'bg-white'
                                ? 'border-gray-300 hover:border-gray-400'
                                : 'border-current border-opacity-40 hover:border-opacity-60'
                            }`}
                          >
                            {subtask.done && <Check size={12} className="text-white" />}
                          </button>
                          <span className={subtask.done ? 'line-through opacity-50' : ''}>
                            {subtask.text}
                          </span>
                          <button
                            onClick={() => handleDeleteSubtask(note.id, subtask.id)}
                            className="ml-auto text-xs opacity-50 hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick add subtask */}
                <SubtaskInput onAdd={(text) => handleAddSubtask(note.id, text)} theme={themeConfig} />

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-current border-opacity-20 mt-3">
                  <span className={`text-xs opacity-60`}>
                    {new Date(note.created_at).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleCloseForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingNote ? '✏️ Editar Nota' : '📝 Nova Nota'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Título *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título da nota..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Conteúdo</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva sua nota aqui..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Prioridade</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          priority === p
                            ? PRIORITY_COLORS[p] + ' ring-2 ring-offset-2'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {p === 'high' ? '🔴 Alta' : p === 'low' ? '🟢 Baixa' : '⚪ Normal'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Cor da Nota</label>
                  <div className="grid grid-cols-4 gap-2">
                    {THEME_OPTIONS.map((t) => {
                      const tc = THEMES[t];
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`h-12 rounded-lg border-2 transition-all ${
                            tc.bg
                          } ${
                            theme === t ? 'ring-2 ring-offset-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                          }`}
                          title={t}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Subtask Input Component
function SubtaskInput({
  onAdd,
  theme,
}: {
  onAdd: (text: string) => void;
  theme: { bg: string; text: string; border: string };
}) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="+ Adicionar subtarefa..."
        className={`flex-1 text-sm px-2 py-1 rounded border ${
          theme.bg === 'bg-white'
            ? 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'
            : 'border-current border-opacity-30 bg-black/20 text-inherit placeholder-current placeholder-opacity-50'
        } outline-none focus:ring-1 focus:ring-blue-500`}
      />
      <button
        type="submit"
        disabled={!input.trim()}
        className="text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
      >
        +
      </button>
    </form>
  );
}
