'use client';

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
  Upload, FileText, Sparkles, Loader2, Copy, Save,
  Eye, EyeOff, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { Report } from '@/types';

interface CSVRow {
  [key: string]: string | number;
}

// Column name aliases (Meta Ads exports vary)
const COL_ALIASES: Record<string, string[]> = {
  'Campaign Name': ['Campaign name', 'Campanha', 'Nome da campanha', 'campaign_name'],
  'Impressions': ['Impressions', 'Impressões', 'impressions'],
  'Clicks': ['Clicks', 'Cliques', 'Link clicks', 'clicks'],
  'CTR': ['CTR', 'CTR (link click-through rate)', 'ctr'],
  'CPC': ['CPC', 'CPC (cost per link click)', 'Cost per click', 'cpc'],
  'CPM': ['CPM', 'Cost per 1,000 impressions', 'cpm'],
  'Spend': ['Amount spent', 'Spend', 'Valor usado', 'spend', 'Gasto'],
  'ROAS': ['ROAS', 'Purchase ROAS', 'roas'],
  'Conversions': ['Conversions', 'Conversões', 'Results', 'conversions'],
  'Reach': ['Reach', 'Alcance', 'reach'],
};

function normalizeColumns(rows: CSVRow[]): CSVRow[] {
  if (!rows.length) return rows;
  const originalKeys = Object.keys(rows[0]);
  const keyMap: Record<string, string> = {};

  for (const [canonical, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const found = originalKeys.find(
        (k) => k.trim().toLowerCase() === alias.toLowerCase()
      );
      if (found) {
        keyMap[found] = canonical;
        break;
      }
    }
  }

  if (!Object.keys(keyMap).length) return rows;

  return rows.map((row) => {
    const normalized: CSVRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[keyMap[key] ?? key] = value;
    }
    return normalized;
  });
}

interface SectionBlock {
  title: string;
  content: string;
  type: 'highlight' | 'warning' | 'danger' | 'default';
}

function parseAnalysisSections(text: string): SectionBlock[] {
  const sectionPatterns = [
    { pattern: /^#+\s*1\.\s*RESUMO EXECUTIVO/im, title: 'Resumo Executivo', type: 'highlight' as const },
    { pattern: /^#+\s*2\.\s*CAMPANHAS DESTAQUE/im, title: 'Campanhas Destaque', type: 'highlight' as const },
    { pattern: /^#+\s*3\.\s*CAMPANHAS COM PROBLEMA/im, title: 'Campanhas com Problema', type: 'danger' as const },
    { pattern: /^#+\s*4\.\s*ANÁLISE DE MÉTRICAS/im, title: 'Análise de Métricas', type: 'default' as const },
    { pattern: /^#+\s*5\.\s*RECOMENDAÇÕES/im, title: 'Recomendações Estratégicas', type: 'warning' as const },
    { pattern: /^#+\s*6\.\s*PRIORIDADES/im, title: 'Prioridades', type: 'warning' as const },
  ];

  const indices: Array<{ idx: number; title: string; type: SectionBlock['type'] }> = [];
  for (const { pattern, title, type } of sectionPatterns) {
    const match = pattern.exec(text);
    if (match) indices.push({ idx: match.index, title, type });
  }
  indices.sort((a, b) => a.idx - b.idx);

  if (!indices.length) return [{ title: 'Análise', content: text, type: 'default' }];

  return indices.map((sec, i) => {
    const start = text.indexOf('\n', sec.idx) + 1;
    const end = i + 1 < indices.length ? indices[i + 1].idx : text.length;
    return { title: sec.title, content: text.slice(start, end).trim(), type: sec.type };
  });
}

const sectionStyles: Record<SectionBlock['type'], string> = {
  highlight: 'border-l-4 border-emerald-400 bg-emerald-50',
  warning: 'border-l-4 border-amber-400 bg-amber-50',
  danger: 'border-l-4 border-red-400 bg-red-50',
  default: 'border-l-4 border-[#4040E8] bg-blue-50',
};

const sectionTitleStyles: Record<SectionBlock['type'], string> = {
  highlight: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  default: 'text-[#4040E8]',
};

interface Props {
  clientId: string;
  clientName: string;
  pastReports: Report[];
}

export function CSVAnalysisTab({ clientId, clientName, pastReports }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [publishedReports, setPublishedReports] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const csvReports = pastReports.filter((r) => r.type === 'csv_analysis');

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast('error', 'Apenas arquivos .csv são aceitos.');
      return;
    }
    setFileName(file.name);
    setAnalysis('');
    setReportId(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const normalized = normalizeColumns(results.data as CSVRow[]);
        setRows(normalized);
        setColumns(Object.keys(normalized[0] ?? {}));
        toast('success', `${normalized.length} linhas carregadas.`);
      },
      error: () => toast('error', 'Erro ao processar o CSV.'),
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async () => {
    if (!rows.length) return;
    setAnalyzing(true);
    setAnalysis('');
    try {
      const res = await fetch('/api/analyze-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, clientId, clientName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
      setReportId(data.reportId);
      toast('success', 'Análise concluída e salva!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao analisar.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis);
    toast('success', 'Relatório copiado!');
  };

  const handlePublish = async (id: string, publish: boolean) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_client: publish }),
      });
      if (res.ok) {
        setPublishedReports((prev) => {
          const next = new Set(prev);
          publish ? next.add(id) : next.delete(id);
          return next;
        });
        toast('success', publish ? 'Publicado para o cliente!' : 'Despublicado.');
      } else {
        toast('error', 'Erro ao atualizar.');
      }
    } catch {
      toast('error', 'Erro de conexão.');
    } finally {
      setSavingId(null);
    }
  };

  const sections = analysis ? parseAnalysisSections(analysis) : [];

  return (
    <div className="space-y-5">
      {/* Upload Area */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Upload de CSV</h3>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-[#4040E8] bg-blue-50'
              : rows.length
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-gray-200 hover:border-[#4040E8] hover:bg-gray-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          {rows.length ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{fileName}</p>
              <p className="text-xs text-emerald-600">{rows.length} linhas • {columns.length} colunas</p>
              <p className="text-xs text-gray-400 mt-1">Clique para trocar o arquivo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Arraste o CSV aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Exportado do Meta Ads Manager — apenas .csv
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preview Table */}
        {rows.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setPreviewExpanded(!previewExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
            >
              {previewExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Preview dos dados ({rows.length} linhas)
            </button>

            {previewExpanded && (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[180px] truncate">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 5 && (
                      <tr>
                        <td colSpan={columns.length} className="px-3 py-2 text-center text-gray-400 italic">
                          + {rows.length - 5} linhas adicionais
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary mt-4 w-full justify-center py-3"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando dados com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar com IA
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {analyzing && (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-[#4040E8] animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Analisando dados com IA...</p>
            <p className="text-sm text-gray-400 mt-1">
              Claude está processando {rows.length} campanhas. Isso pode levar alguns segundos.
            </p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#4040E8]" />
        </div>
      )}

      {analysis && !analyzing && (
        <div className="card p-5 space-y-4">
          {/* Report Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4040E8]" />
                Análise gerada pela IA
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleString('pt-BR')} · {rows.length} campanhas analisadas
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="btn-secondary text-xs py-1.5">
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
              {reportId && (
                <button
                  onClick={() => handlePublish(reportId, !publishedReports.has(reportId))}
                  disabled={savingId === reportId}
                  className={publishedReports.has(reportId) ? 'btn-secondary text-xs py-1.5' : 'btn-primary text-xs py-1.5'}
                >
                  {savingId === reportId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : publishedReports.has(reportId) ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {publishedReports.has(reportId) ? 'Despublicar' : 'Publicar para cliente'}
                </button>
              )}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {sections.map((section, i) => (
              <div key={i} className={`rounded-lg p-4 ${sectionStyles[section.type]}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${sectionTitleStyles[section.type]}`}>
                  {section.title}
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Analyses */}
      {csvReports.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Análises anteriores
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {csvReports.slice(0, 5).map((r) => (
              <PastAnalysisRow
                key={r.id}
                report={r}
                onPublish={handlePublish}
                savingId={savingId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PastAnalysisRow({
  report,
  onPublish,
  savingId,
}: {
  report: Report;
  onPublish: (id: string, publish: boolean) => void;
  savingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const analysis = report.admin_edited_analysis ?? report.claude_analysis ?? '';
  const sections = parseAnalysisSections(analysis);

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Análise CSV — {formatDate(report.created_at)}
            </p>
            <p className="text-xs text-gray-400">
              {(report.content_json as { rows_count?: number })?.rows_count ?? 0} campanhas
            </p>
          </div>
          {report.visible_to_client ? (
            <span className="badge-active text-[10px]">Publicado</span>
          ) : (
            <span className="badge-paused text-[10px]">Rascunho</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPublish(report.id, !report.visible_to_client)}
            disabled={savingId === report.id}
            className={report.visible_to_client ? 'btn-secondary text-xs py-1' : 'btn-primary text-xs py-1'}
          >
            {savingId === report.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : report.visible_to_client ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
            {report.visible_to_client ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-secondary text-xs py-1"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Fechar' : 'Ver'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {sections.map((sec, i) => (
            <div key={i} className={`rounded-lg p-3 ${sectionStyles[sec.type]}`}>
              <h4 className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${sectionTitleStyles[sec.type]}`}>
                {sec.title}
              </h4>
              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                {sec.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
