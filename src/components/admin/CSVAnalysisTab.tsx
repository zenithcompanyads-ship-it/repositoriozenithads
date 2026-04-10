'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
  Upload, Loader2, Eye, EyeOff,
  CheckCircle, ChevronDown, ChevronUp, TrendingUp, Calendar, FileText, ExternalLink,
  Users, Download, AlertCircle, Copy, Check, Send, Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { Report } from '@/types';

interface CSVRow {
  [key: string]: string | number;
}

const COL_ALIASES: Record<string, string[]> = {
  'Campaign Name': ['Campaign name', 'Campanha', 'Nome da campanha', 'campaign_name'],
  'Impressions':   ['Impressions', 'Impressões', 'impressions'],
  'Clicks':        ['Clicks', 'Cliques', 'Link clicks', 'clicks'],
  'CTR':           ['CTR', 'CTR (link click-through rate)', 'ctr'],
  'CPC':           ['CPC', 'CPC (cost per link click)', 'Cost per click', 'Custo por resultados', 'Cost per result', 'cpc'],
  'CPM':           ['CPM', 'Cost per 1,000 impressions', 'cpm'],
  'Spend':         ['Amount spent', 'Amount spent (BRL)', 'Spend', 'Valor usado', 'Valor usado (BRL)', 'spend', 'Gasto'],
  'ROAS':          ['ROAS', 'Purchase ROAS', 'roas'],
  'Conversions':   ['Conversions', 'Conversões', 'Results', 'Resultados', 'conversions'],
  'Reach':         ['Reach', 'Alcance', 'reach'],
  'Budget':        ['Budget', 'Orçamento', 'Orçamento do conjunto de anúncios', 'budget'],
};

function normalizeColumns(rows: CSVRow[]): CSVRow[] {
  if (!rows.length) return rows;
  const originalKeys = Object.keys(rows[0]);
  const keyMap: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const found = originalKeys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
      if (found) { keyMap[found] = canonical; break; }
    }
  }
  if (!Object.keys(keyMap).length) return rows;
  return rows.map((row) => {
    const normalized: CSVRow = {};
    for (const [key, value] of Object.entries(row)) normalized[keyMap[key] ?? key] = value;
    return normalized;
  });
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function ptDate(d: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T12:00:00'));
}

interface ImportMeta {
  reportId: string | null;
  periodType: 'weekly' | 'biweekly' | 'monthly';
  areasUpdated: string[];
  hasAiAnalysis: boolean;
  aiSummary: string | null;
  aiError: string | null;
  totalSpend: number;
  monthlyProjection: number;
  periodStart: string;
  periodEnd: string;
  numDays: number;
  daysInMonth: number;
  campaigns: Array<{ name: string; spend: number; conversions: number; cpc: number; status: string; objective: string | null; budget: number }>;
}

interface Props {
  clientId: string;
  clientName: string;
  pastReports: Report[];
}

// ── Copy button helper ────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CSVAnalysisTab({ clientId, clientName, pastReports }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]         = useState(false);
  const [fileName, setFileName]             = useState('');
  const [rows, setRows]                     = useState<CSVRow[]>([]);
  const [columns, setColumns]               = useState<string[]>([]);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [campaignExpanded, setCampaignExpanded] = useState(false);
  const [analyzing, setAnalyzing]           = useState(false);
  const [importMeta, setImportMeta]         = useState<ImportMeta | null>(null);
  const [publishedIds, setPublishedIds]     = useState<Set<string>>(new Set());
  const [savingId, setSavingId]             = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [localReports, setLocalReports]     = useState<Report[]>(pastReports);

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) { toast('error', 'Apenas arquivos .csv são aceitos.'); return; }
    setFileName(file.name);
    setImportMeta(null);
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
    e.preventDefault(); setIsDragging(false);
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
    setImportMeta(null);
    try {
      const res = await fetch('/api/analyze-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, clientId, clientName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: { reportId: string | null; meta: ImportMeta } = await res.json();
      setImportMeta(data.meta);
      toast('success', 'Relatório gerado! Revise e publique para o cliente.');
      router.refresh();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao gerar relatório.');
    } finally {
      setAnalyzing(false);
    }
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
        setPublishedIds((prev) => { const s = new Set(prev); publish ? s.add(id) : s.delete(id); return s; });
        toast('success', publish ? '✓ Publicado para o cliente!' : 'Relatório ocultado.');
      } else toast('error', 'Erro ao atualizar.');
    } catch { toast('error', 'Erro de conexão.'); }
    finally { setSavingId(null); }
  };

  const isPublished = (id: string) => publishedIds.has(id);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocalReports((prev) => prev.filter((r) => r.id !== id));
        toast('success', 'Relatório excluído.');
      } else {
        toast('error', 'Erro ao excluir.');
      }
    } catch { toast('error', 'Erro de conexão.'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-5">

      {/* ── Upload ───────────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Upload de CSV — Meta Ads</h3>
          {rows.length > 0 && (
            <span className="text-xs text-emerald-600 font-medium">{rows.length} linhas · {columns.length} colunas</span>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragging    ? 'border-[#4040E8] bg-[#4040E8]/5 scale-[1.01] shadow-lg shadow-[#4040E8]/10' :
            rows.length   ? 'border-emerald-400/60 bg-emerald-50/80' :
            'border-gray-200 hover:border-[#4040E8]/50 hover:bg-gray-50/60 hover:shadow-sm'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
          {rows.length ? (
            <div className="flex flex-col items-center gap-1.5">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{fileName}</p>
              <p className="text-xs text-gray-400">Clique para trocar</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-[#4040E8]/15 rotate-6' : 'bg-gray-100'}`}>
                <Upload className={`w-6 h-6 transition-colors duration-300 ${isDragging ? 'text-[#4040E8]' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {isDragging ? 'Solte o arquivo aqui' : 'Arraste o CSV ou clique para selecionar'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Exportado do Meta Ads Manager · apenas .csv</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview (collapsed by default) */}
        {rows.length > 0 && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => setPreviewExpanded(!previewExpanded)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              {previewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {previewExpanded ? 'Ocultar preview' : `Ver preview (${Math.min(rows.length, 5)} de ${rows.length} linhas)`}
            </button>

            {previewExpanded && (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{col}</th>
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
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`btn-primary w-full justify-center py-3 text-sm transition-all duration-300 ${analyzing ? 'opacity-80' : 'hover:scale-[1.01] hover:shadow-lg hover:shadow-[#4040E8]/20'}`}
            >
              {analyzing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando e gerando resumo com IA...</>
                : <><TrendingUp className="w-4 h-4" /> Processar CSV e Gerar Relatório</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {analyzing && (
        <div className="card p-10 flex flex-col items-center gap-5 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-[#4040E8]/8 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-[#4040E8] animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[#4040E8]/20 animate-ping" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-base">Gerando relatório com IA...</p>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">Identificando campanhas · calculando métricas · análise estratégica</p>
          </div>
        </div>
      )}

      {/* ── Result ───────────────────────────────────────────────────────────── */}
      {importMeta && !analyzing && (
        <div className="space-y-4">

          {/* AI error notice */}
          {importMeta.aiError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span><strong>Resumo com IA indisponível:</strong> {importMeta.aiError}. Os dados foram salvos normalmente.</span>
            </div>
          )}

          {/* AI Summary — hero card */}
          {importMeta.aiSummary && (
            <div className="card overflow-hidden border-2 border-[#4040E8]/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#4040E8]/5 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#4040E8]/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-[#4040E8]" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Resumo do Período</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4040E8]/10 text-[#4040E8]">
                    {importMeta.periodType === 'weekly' ? 'Semanal' : importMeta.periodType === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                  </span>
                </div>
                <CopyButton text={importMeta.aiSummary} />
              </div>
              <div className="px-5 py-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {importMeta.aiSummary}
                </pre>
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="card p-4 border-l-4 border-[#4040E8] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Período</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#4040E8]" />
                <p className="text-xs font-semibold text-gray-800">{ptDate(importMeta.periodStart)} → {ptDate(importMeta.periodEnd)}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{importMeta.numDays} dias de dados</p>
            </div>
            <div className="card p-4 border-l-4 border-[#4040E8] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Investimento Total</p>
              <p className="text-xl font-bold text-[#4040E8]">{brl(importMeta.totalSpend)}</p>
            </div>
            <div className="card p-4 border-l-4 border-emerald-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Projeção do Mês</p>
              <p className="text-xl font-bold text-emerald-600">{brl(importMeta.monthlyProjection)}</p>
              <p className="text-[10px] text-gray-400 mt-1">{brl(importMeta.totalSpend / importMeta.numDays)}/dia × {importMeta.daysInMonth}d</p>
            </div>
            <div className="card p-4 border-l-4 border-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Campanhas</p>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xl font-bold text-gray-800">{importMeta.campaigns.length}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{importMeta.campaigns.filter(c => c.status === 'ACTIVE').length} ativas</p>
            </div>
          </div>

          {/* Areas updated */}
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Atualizado:</span>
            {importMeta.areasUpdated.map((area) => (
              <span key={area} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle className="w-2.5 h-2.5" /> {area}
              </span>
            ))}
          </div>

          {/* Campaign breakdown (collapsible) */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setCampaignExpanded(!campaignExpanded)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">Campanhas importadas</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{importMeta.campaigns.length} campanhas · {importMeta.campaigns.filter(c => c.status === 'ACTIVE').length} ativas</span>
                {campaignExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {campaignExpanded && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['#', 'Campanha', 'Objetivo', 'Investido', 'Resultados', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {importMeta.campaigns.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate">{c.name}</td>
                        <td className="px-3 py-2 text-gray-400 max-w-[120px] truncate">{c.objective ?? '—'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-700">{brl(c.spend)}</td>
                        <td className="px-3 py-2 text-gray-600">{c.conversions.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Primary action: Publish */}
          {importMeta.reportId && (
            <div className="card p-4 bg-gradient-to-r from-[#4040E8]/5 to-transparent border border-[#4040E8]/15 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pronto para publicar?</p>
                  <p className="text-xs text-gray-500 mt-0.5">O cliente verá o relatório no portal assim que você publicar.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/reports/html/${importMeta.reportId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs py-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Visualizar
                  </a>
                  <a
                    href={`/api/admin/reports/${importMeta.reportId}/pdf`}
                    download
                    className="btn-secondary text-xs py-2"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                  <button
                    onClick={() => handlePublish(importMeta.reportId!, !isPublished(importMeta.reportId!))}
                    disabled={savingId === importMeta.reportId}
                    className={`text-xs py-2 px-4 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                      isPublished(importMeta.reportId)
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-[#4040E8] text-white hover:bg-[#3333cc]'
                    }`}
                  >
                    {savingId === importMeta.reportId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                     isPublished(importMeta.reportId) ? <EyeOff className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    {isPublished(importMeta.reportId) ? 'Despublicar' : 'Publicar para o Cliente'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Past Analyses ──────────────────────────────────────────────────────── */}
      {localReports.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Relatórios anteriores</h3>
            <span className="text-xs text-gray-400">{localReports.length} relatório{localReports.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {localReports.slice(0, 8).map((r) => (
              <PastAnalysisRow
                key={r.id}
                report={r}
                onPublish={handlePublish}
                onDelete={handleDelete}
                savingId={savingId}
                deletingId={deletingId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Past Analysis Row ─────────────────────────────────────────────────────────
function PastAnalysisRow({
  report, onPublish, onDelete, savingId, deletingId,
}: {
  report: Report;
  onPublish: (id: string, publish: boolean) => void;
  onDelete: (id: string, label: string) => void;
  savingId: string | null;
  deletingId: string | null;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const meta = report.content_json as {
    rows_count?: number;
    totalSpend?: number;
    totalConversions?: number;
    periodType?: string;
    numDays?: number;
    ai_summary?: string;
  } | null;

  const periodLabel = meta?.periodType === 'weekly' ? 'Semanal'
    : meta?.periodType === 'biweekly' ? 'Quinzenal'
    : 'Mensal';

  const periodStr = report.period_start && report.period_end
    ? `${new Intl.DateTimeFormat('pt-BR').format(new Date(report.period_start + 'T12:00:00'))} → ${new Intl.DateTimeFormat('pt-BR').format(new Date(report.period_end + 'T12:00:00'))}`
    : formatDate(report.created_at);

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-[#4040E8]/8 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-[#4040E8]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">CSV {periodLabel} — {periodStr}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                report.visible_to_client ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {report.visible_to_client ? '● Publicado' : '○ Rascunho'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {meta?.rows_count ?? 0} campanhas
              {meta?.totalSpend != null && ` · ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta.totalSpend)}`}
              {meta?.totalConversions != null && meta.totalConversions > 0 && ` · ${meta.totalConversions} resultados`}
              {meta?.numDays != null && ` · ${meta.numDays} dias`}
            </p>
            {meta?.ai_summary && (
              <button onClick={() => setSummaryOpen(!summaryOpen)} className="flex items-center gap-1 text-[10px] text-[#4040E8] mt-1 hover:underline">
                {summaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {summaryOpen ? 'Ocultar resumo' : 'Ver resumo'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={`/api/admin/reports/${report.id}/pdf`} download className="btn-secondary text-xs py-1.5">
            <Download className="w-3 h-3" /> PDF
          </a>
          <a href={`/api/reports/html/${report.id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5">
            <ExternalLink className="w-3 h-3" /> Ver
          </a>
          <button
            onClick={() => onPublish(report.id, !report.visible_to_client)}
            disabled={savingId === report.id}
            className={report.visible_to_client ? 'btn-secondary text-xs py-1.5' : 'btn-primary text-xs py-1.5'}
          >
            {savingId === report.id
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : report.visible_to_client ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {report.visible_to_client ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            onClick={() => onDelete(report.id, `CSV ${periodLabel} — ${periodStr}`)}
            disabled={deletingId === report.id}
            className="btn-secondary text-xs py-1.5 text-red-500 hover:text-red-600 hover:border-red-200"
            title="Excluir relatório"
          >
            {deletingId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Excluir
          </button>
        </div>
      </div>

      {/* Expandable summary */}
      {summaryOpen && meta?.ai_summary && (
        <div className="mt-3 ml-12">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative">
            <div className="absolute top-3 right-3">
              <CopyButton text={meta.ai_summary} />
            </div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans pr-20">{meta.ai_summary}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
