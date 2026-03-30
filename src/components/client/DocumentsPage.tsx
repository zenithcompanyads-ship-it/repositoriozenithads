'use client';

import { useState, useEffect } from 'react';
import { FileText, FileBadge, Download, ExternalLink, FolderOpen, Loader2 } from 'lucide-react';

interface DocumentItem {
  id: string;
  display_name: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
  signed_url: string | null;
}

function fileTypeLabel(type: string) {
  if (type === 'application/pdf') return 'PDF';
  if (type === 'application/msword') return 'DOC';
  if (type.includes('wordprocessingml')) return 'DOCX';
  return type.split('/')[1]?.toUpperCase() ?? 'Arquivo';
}

function fileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocTypeIcon({ type }: { type: string }) {
  if (type === 'application/pdf') {
    return (
      <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
        <FileBadge className="w-5 h-5 text-red-500" />
      </div>
    );
  }
  return (
    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
      <FileText className="w-5 h-5 text-blue-500" />
    </div>
  );
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/client/documents')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocuments(data);
        else setError(data.error ?? 'Erro ao carregar.');
      })
      .catch(() => setError('Erro de conexão.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#4040E8]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Materiais e documentos disponibilizados pela sua agência.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">Nenhum documento disponível</p>
          <p className="text-xs text-gray-400 mt-1">
            Seus documentos aparecerão aqui assim que forem disponibilizados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <DocTypeIcon type={doc.file_type} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{doc.display_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fileTypeLabel(doc.file_type)}
                  {doc.file_size ? ` · ${fileSize(doc.file_size)}` : ''}
                </p>
              </div>

              {doc.signed_url && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir
                  </a>
                  <a
                    href={doc.signed_url}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4040E8] text-white hover:bg-[#3333cc] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
