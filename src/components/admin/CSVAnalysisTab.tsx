'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
  Upload, Loader2, Eye, EyeOff,
  CheckCircle, ChevronDown, ChevronUp, TrendingUp, Calendar, FileText, ExternalLink,
  BarChart2, Users, Database, Download, AlertCircle, Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { Report } from '@/types';

interface CSVRow {
  [key: string]: string | number;
}

// Normalize Portuguese/English column names to canonical English
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

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function formatPtDate(d: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T12:00:00'));
}

interface ImportMeta {
  reportId: string | null;
  periodType: 'weekly' | 'biweekly' | 'monthly';
  areasUpdated: string[];
  hasAiAnalysis: boolean;
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

export function CSVAnalysisTab({ clientId, clientName, pastReports }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [fileName, setFileName]         = useState('');
  const [rows, setRows]                 = useState<CSVRow[]>([]);
  const [columns, setColumns]           = useState<string[]>([]);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [analyzing, setAnalyzing]       = useState(false);
  const [importMeta, setImportMeta]     = useState<ImportMeta | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId]         = useState<string | null>(null);

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

  // ── Main analysis handler (no Claude — pure server-side calculation) ─────────
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
      toast('success', 'Relatório gerado com sucesso! Dados salvos no Supabase.');
      // Refresh server components (campaigns list, metrics chart, etc.)
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
        toast('success', publish ? 'Publicado para o cliente!' : 'Despublicado.');
      } else toast('error', 'Erro ao atualizar.');
    } catch { toast('error', 'Erro de conexão.'); }
    finally { setSavingId(null); }
  };

  return (
    <div className="space-y-5">
      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Upload de CSV — Meta Ads</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-[#4040E8] bg-blue-50' :
            rows.length ? 'border-emerald-400 bg-emerald-50' :
            'border-gray-200 hover:border-[#4040E8] hover:bg-gray-50'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
          {rows.length ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{fileName}</p>
              <p className="text-xs text-emerald-600">{rows.length} linhas · {columns.length} colunas</p>
              <p className="text-xs text-gray-400 mt-1">Clique para trocar o arquivo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Arraste o CSV aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">Exportado do Meta Ads Manager · apenas .csv</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando relatório...</>
              ) : (
                <><TrendingUp className="w-4 h-4" /> Gerar Relatório</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {analyzing && (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#4040E8] animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Processando dados e gerando análise...</p>
            <p className="text-sm text-gray-400 mt-1">
              Estruturando métricas, gerando análise com IA e preparando o PDF.
            </p>
          </div>
        </div>
      )}

      {/* ── Import Summary ──────────────────────────────────────────────────── */}
      {importMeta && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Análise Gerada com Sucesso</h3>
            </div>
            <div className="flex items-center gap-2">
              {importMeta.hasAiAnalysis ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-2.5 h-2.5" /> IA incluída
                </span>
              ) : importMeta.aiError ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200" title={importMeta.aiError}>
                  <AlertCircle className="w-2.5 h-2.5" /> Sem análise IA
                </span>
              ) : null}
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#4040E8] border border-[#4040E8]/20">
                {importMeta.periodType === 'weekly' ? 'Semanal' : importMeta.periodType === 'biweekly' ? 'Quinzenal' : 'Mensal'}
              </span>
            </div>
          </div>

          {importMeta.aiError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span><strong>Análise com IA indisponível:</strong> {importMeta.aiError}. O PDF será gerado com os dados estruturados.</span>
            </div>
          )}

          {/* Areas updated */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-100">
            <p className="w-full text-[10px] uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
              <Database className="w-3 h-3" /> Áreas atualizadas
            </p>
            {importMeta.areasUpdated.map((area) => (
              <span key={area} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-2.5 h-2.5" /> {area}
              </span>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Período</p>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#4040E8]" />
                <p className="text-xs font-semibold text-gray-800">
                  {formatPtDate(importMeta.periodStart)} — {formatPtDate(importMeta.periodEnd)}
                </p>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{importMeta.numDays} dias de dados</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Investimento Total</p>
              <p className="text-lg font-bold text-[#4040E8]">{formatBRL(importMeta.totalSpend)}</p>
              <p className="text-[10px] text-gray-400">{importMeta.numDays} dias</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Projeção do Mês</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-lg font-bold text-emerald-600">{formatBRL(importMeta.monthlyProjection)}</p>
              </div>
              <p className="text-[10px] text-gray-400">
                {formatBRL(importMeta.totalSpend / importMeta.numDays)}/dia × {importMeta.daysInMonth} dias
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Campanhas</p>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-lg font-bold text-gray-800">{importMeta.campaigns.length}</p>
              </div>
              <p className="text-[10px] text-gray-400">
                {importMeta.campaigns.filter(c => c.status === 'ACTIVE').length} ativas
              </p>
            </div>
          </div>

          {/* Campaign breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" /> Top Campanhas por Investimento
            </h4>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', 'Campanha', 'Objetivo', 'Investido', 'Resultados', 'CPC', 'Status'].map(h => (
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
                      <td className="px-3 py-2 text-gray-700 font-semibold">{formatBRL(c.spend)}</td>
                      <td className="px-3 py-2 text-gray-600">{c.conversions.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-gray-600">{c.cpc > 0 ? formatBRL(c.cpc) : '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          {importMeta.reportId && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <p className="w-full text-xs text-gray-500 mb-1">Ações do relatório:</p>
              <a
                href={`/api/admin/reports/${importMeta.reportId}/pdf`}
                download
                className="btn-primary text-xs py-1.5"
              >
                <Download className="w-3 h-3" /> Baixar PDF
              </a>
              <a
                href={`/api/reports/html/${importMeta.reportId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-1.5"
              >
                <ExternalLink className="w-3 h-3" /> Visualizar Online
              </a>
              <button
                onClick={() => handlePublish(importMeta.reportId!, !publishedIds.has(importMeta.reportId!))}
                disabled={savingId === importMeta.reportId}
                className={publishedIds.has(importMeta.reportId) ? 'btn-secondary text-xs py-1.5' : 'btn-secondary text-xs py-1.5'}
              >
                {savingId === importMeta.reportId ? <Loader2 className="w-3 h-3 animate-spin" /> :
                 publishedIds.has(importMeta.reportId) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {publishedIds.has(importMeta.reportId) ? 'Despublicar' : 'Publicar para o Cliente'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Past Analyses ──────────────────────────────────────────────────── */}
      {pastReports.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Análises anteriores</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {pastReports.slice(0, 5).map((r) => (
              <PastAnalysisRow key={r.id} report={r} onPublish={handlePublish} savingId={savingId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PastAnalysisRow({
  report, onPublish, savingId,
}: { report: Report; onPublish: (id: string, publish: boolean) => void; savingId: string | null }) {
  const meta = report.content_json as {
    rows_count?: number;
    totalSpend?: number;
    totalConversions?: number;
    periodType?: string;
    numDays?: number;
  } | null;

  const periodLabel = meta?.periodType === 'weekly' ? 'Semanal'
    : meta?.periodType === 'biweekly' ? 'Quinzenal'
    : 'Mensal';

  const periodStr = report.period_start && report.period_end
    ? `${formatPtDate(report.period_start)} → ${formatPtDate(report.period_end)}`
    : formatDate(report.created_at);

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-[#4040E8]/10 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-[#4040E8]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">
                CSV {periodLabel} — {periodStr}
              </p>
              {report.visible_to_client ? (
                <span className="badge-active text-[10px]">Publicado</span>
              ) : (
                <span className="badge-paused text-[10px]">Rascunho</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {meta?.rows_count ?? 0} campanhas
              {meta?.totalSpend != null && ` · ${formatBRL(meta.totalSpend)}`}
              {meta?.totalConversions != null && meta.totalConversions > 0 && ` · ${meta.totalConversions} resultados`}
              {meta?.numDays != null && ` · ${meta.numDays} dias`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/admin/reports/${report.id}/pdf`}
            download
            className="btn-secondary text-xs py-1.5"
          >
            <Download className="w-3 h-3" /> PDF
          </a>
          <a
            href={`/api/reports/html/${report.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5"
          >
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
        </div>
      </div>
    </div>
  );
}
