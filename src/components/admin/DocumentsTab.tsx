'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Loader2, Trash2, Eye, EyeOff, FileText, FileBadge,
  Pencil, Check, X, ExternalLink, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { ClientDocument } from '@/types';

interface Props {
  clientId: string;
  initialDocuments: ClientDocument[];
}

function fileTypeLabel(type: string) {
  if (type === 'application/pdf') return 'PDF';
  if (type === 'application/msword') return 'DOC';
  if (type.includes('wordprocessingml')) return 'DOCX';
  return type.split('/')[1]?.toUpperCase() ?? 'Arquivo';
}

function fileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ type }: { type: string }) {
  if (type === 'application/pdf') {
    return <FileBadge className="w-4 h-4 text-red-500" />;
  }
  return <FileText className="w-4 h-4 text-blue-500" />;
}

// ── Inline name editor ─────────────────────────────────────────────────────
function NameEditor({
  docId, value, onSaved,
}: { docId: string; value: string; onSaved: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onSaved(trimmed);
      setEditing(false);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm font-medium text-gray-900 border-b border-[#4040E8] bg-transparent outline-none min-w-0 flex-1"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 rounded hover:bg-emerald-50 text-emerald-600"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => { setDraft(value); setEditing(false); }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group min-w-0">
      <span className="text-sm font-semibold text-gray-900 truncate">{value}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-gray-400 shrink-0"
        title="Renomear"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function DocumentsTab({ clientId, initialDocuments }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>(initialDocuments);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast('error', 'Apenas PDF, DOC e DOCX são aceitos.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('error', 'Arquivo muito grande. Máximo 20MB.');
      return;
    }
    setPendingFile(file);
    setPendingName(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleUpload = async () => {
    if (!pendingFile || !pendingName.trim()) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', pendingFile);
      form.append('display_name', pendingName.trim());

      const res = await fetch(`/api/admin/clients/${clientId}/documents`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created: ClientDocument = await res.json();
      setDocuments((prev) => [created, ...prev]);
      setPendingFile(null);
      setPendingName('');
      toast('success', 'Documento enviado com sucesso!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao enviar.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVisibility = async (doc: ClientDocument) => {
    setTogglingId(doc.id);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_client: !doc.visible_to_client }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDocuments((prev) =>
        prev.map((d) => d.id === doc.id ? { ...d, visible_to_client: !d.visible_to_client } : d)
      );
      toast('success', doc.visible_to_client ? 'Documento ocultado do cliente.' : 'Documento liberado para o cliente!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (doc: ClientDocument) => {
    if (!confirm(`Excluir "${doc.display_name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast('success', 'Documento excluído.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenDoc = async (doc: ClientDocument) => {
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/url`);
      if (!res.ok) throw new Error((await res.json()).error);
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch {
      toast('error', 'Erro ao abrir documento.');
    }
  };

  const handleNameSaved = (docId: string, newName: string) => {
    setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, display_name: newName } : d));
  };

  return (
    <div className="space-y-5">

      {/* ── Upload área ───────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Enviar documento</h3>

        {!pendingFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#4040E8] bg-blue-50' : 'border-gray-200 hover:border-[#4040E8] hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="hidden"
            />
            <Upload className="w-7 h-7 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Arraste o arquivo aqui ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOC ou DOCX · máximo 20MB</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <DocIcon type={pendingFile.type} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{pendingFile.name}</p>
                <p className="text-[11px] text-gray-400">{fileTypeLabel(pendingFile.type)} · {fileSize(pendingFile.size)}</p>
              </div>
              <button onClick={() => { setPendingFile(null); setPendingName(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nome exibido para o cliente</label>
              <input
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder="Ex: Planejamento — Março 2025"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4040E8] focus:ring-1 focus:ring-[#4040E8]/20"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setPendingFile(null); setPendingName(''); }}
                className="btn-secondary text-sm py-2 flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !pendingName.trim()}
                className="btn-primary text-sm py-2 flex-1 justify-center"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar documento'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Lista de documentos ───────────────────────────────────────────── */}
      {documents.length === 0 ? (
        <div className="card p-8 text-center">
          <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhum documento enviado ainda.</p>
          <p className="text-xs text-gray-300 mt-1">Envie PDFs ou documentos Word para compartilhar com o cliente.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Documentos</h3>
            <span className="text-xs text-gray-400">
              {documents.length} documento{documents.length > 1 ? 's' : ''} ·{' '}
              {documents.filter(d => d.visible_to_client).length} liberado{documents.filter(d => d.visible_to_client).length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {documents.map((doc) => (
              <div key={doc.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <DocIcon type={doc.file_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <NameEditor
                        docId={doc.id}
                        value={doc.display_name}
                        onSaved={(name) => handleNameSaved(doc.id, name)}
                      />
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-400">
                          {fileTypeLabel(doc.file_type)}
                          {doc.file_size ? ` · ${fileSize(doc.file_size)}` : ''}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.visible_to_client ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {doc.visible_to_client ? '● Liberado' : '○ Oculto'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenDoc(doc)}
                      className="btn-secondary text-xs py-1.5"
                      title="Abrir documento"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(doc)}
                      disabled={togglingId === doc.id}
                      className={doc.visible_to_client ? 'btn-secondary text-xs py-1.5' : 'btn-primary text-xs py-1.5'}
                      title={doc.visible_to_client ? 'Ocultar do cliente' : 'Liberar para o cliente'}
                    >
                      {togglingId === doc.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : doc.visible_to_client ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {doc.visible_to_client ? 'Ocultar' : 'Liberar'}
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="btn-secondary text-xs py-1.5 text-red-500 hover:text-red-600 hover:border-red-200"
                      title="Excluir documento"
                    >
                      {deletingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
