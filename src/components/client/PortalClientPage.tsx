'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  ArrowRight,
  BarChart2,
  Users,
  Eye,
  Zap,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportCampaign {
  name: string;
  status: string;
  objective?: string | null;
  resultType?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  budget?: number;
}

interface ReportContent {
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks?: number;
  totalConversions: number;
  frequency?: number;
  resultType?: string | null;
  numDays: number;
  periodStart?: string;
  periodEnd?: string;
  periodType?: string;
  campaigns?: ReportCampaign[];
  ai_summary?: string | null;
  monthlyProjection?: number;
}

interface ClientReport {
  id: string;
  period_start: string;
  period_end: string;
  created_at: string;
  content_json: unknown;
  type: string;
}

interface ClientInfo {
  name: string;
  initials: string | null;
  color: string;
  avatar_url: string | null;
  segment: string | null;
}

interface DbCampaign {
  name: string;
  status: string;
  objective: string | null;
  result_type: string | null;
  spend: number;
  impressions: number;
  conversions: number;
  reach: number;
  budget: number | null;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function num(v: number) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function periodTypeLabel(numDays: number) {
  if (numDays <= 7) return 'Semanal';
  if (numDays <= 16) return 'Quinzenal';
  return 'Mensal';
}
function monthLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

type DateRange = { start: Date; end: Date };

function dStr(d: Date) { return d.toISOString().split('T')[0]; }

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS_SHORT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function buildPresets(today: Date): Array<{ label: string; range: DateRange }> {
  const sw    = startOfWeek(today);
  const psw   = addDays(sw, -7);
  const sm    = startOfMonth(today);
  const lmF   = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lmL   = endOfMonth(lmF);
  return [
    { label: 'Hoje',           range: { start: today,             end: today } },
    { label: 'Ontem',          range: { start: addDays(today,-1), end: addDays(today,-1) } },
    { label: 'Hoje e ontem',   range: { start: addDays(today,-1), end: today } },
    { label: 'Últimos 7 dias', range: { start: addDays(today,-6), end: today } },
    { label: 'Últimos 14 dias',range: { start: addDays(today,-13),end: today } },
    { label: 'Últimos 28 dias',range: { start: addDays(today,-27),end: today } },
    { label: 'Últimos 30 dias',range: { start: addDays(today,-29),end: today } },
    { label: 'Esta semana',    range: { start: sw,                end: today } },
    { label: 'Semana passada', range: { start: psw,               end: addDays(psw,6) } },
    { label: 'Este mês',       range: { start: sm,                end: today } },
    { label: 'Mês passado',    range: { start: lmF,               end: lmL } },
  ];
}

function findBestReport(reports: ClientReport[], range: DateRange): number {
  if (!reports.length) return 0;
  const selS = range.start.getTime();
  const selE = range.end.getTime();
  let best = 0, bestScore = -1;
  for (let i = 0; i < reports.length; i++) {
    const rS = new Date(reports[i].period_start + 'T12:00:00').getTime();
    const rE = new Date(reports[i].period_end   + 'T12:00:00').getTime();
    const overlap = Math.max(0, Math.min(rE, selE) - Math.max(rS, selS));
    if (overlap > bestScore) { bestScore = overlap; best = i; }
  }
  if (bestScore === 0) {
    const mid = (selS + selE) / 2;
    let minD = Infinity;
    for (let i = 0; i < reports.length; i++) {
      const rMid = (new Date(reports[i].period_start+'T12:00:00').getTime() + new Date(reports[i].period_end+'T12:00:00').getTime()) / 2;
      const d = Math.abs(rMid - mid);
      if (d < minD) { minD = d; best = i; }
    }
  }
  return best;
}

function MonthCalendar({
  year, month, selecting, hoverDate, today, onDateClick, onDateHover,
}: {
  year: number; month: number;
  selecting: { start: Date | null; end: Date | null };
  hoverDate: Date | null; today: Date;
  onDateClick: (d: Date) => void; onDateHover: (d: Date | null) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dow = firstDay.getDay();
  const offset = dow === 0 ? 6 : dow - 1;

  const cells: Array<Date | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  let rS = selecting.start;
  let rE = selecting.end ?? hoverDate;
  if (rS && rE && rS > rE) [rS, rE] = [rE, rS];

  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#EEEEE8', fontWeight: 600, marginBottom: 10, letterSpacing: 0.3 }}>
        {MONTH_FULL[month]} &nbsp;·&nbsp; {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, color:'#6E7A5E', padding:'4px 0', fontWeight:600 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = dStr(day);
          const isS = rS ? dStr(rS) === ds : false;
          const isE = rE ? dStr(rE) === ds : false;
          const inR = rS && rE ? day >= rS && day <= rE : false;
          const isTd = dStr(day) === dStr(today);
          const sel  = isS || isE;
          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              onMouseEnter={() => onDateHover(day)}
              onMouseLeave={() => onDateHover(null)}
              style={{
                textAlign:'center', fontSize:12.5, padding:'6px 2px', borderRadius: sel ? 20 : 4,
                cursor:'pointer', userSelect:'none',
                fontWeight: sel ? 700 : 400,
                color:  sel  ? '#090D06' : inR  ? '#EEEEE8' : isTd ? '#9FE870' : '#EEEEE8',
                background: sel ? '#9FE870' : inR ? 'rgba(159,232,112,0.18)' : 'transparent',
                border: isTd && !sel ? '1px solid rgba(159,232,112,0.4)' : '1px solid transparent',
                transition: 'background 0.08s',
              }}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({
  reports, appliedRange, onApply,
}: {
  reports: ClientReport[];
  appliedRange: DateRange | null;
  onApply: (range: DateRange, idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const presets = buildPresets(today);

  const initLeft = () => {
    const d = appliedRange?.start ?? today;
    return new Date(d.getFullYear(), d.getMonth() - (appliedRange ? 1 : 0), 1);
  };
  const [leftMonth, setLeftMonth] = useState<Date>(initLeft);
  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

  const [selecting, setSelecting] = useState<{ start: Date | null; end: Date | null }>({
    start: appliedRange?.start ?? null, end: appliedRange?.end ?? null,
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleDateClick = useCallback((d: Date) => {
    setActivePreset(null);
    setSelecting(prev => {
      if (!prev.start || (prev.start && prev.end)) return { start: d, end: null };
      return d < prev.start ? { start: d, end: prev.start } : { start: prev.start, end: d };
    });
  }, []);

  const handlePreset = (p: { label: string; range: DateRange }) => {
    setActivePreset(p.label);
    setSelecting({ start: p.range.start, end: p.range.end });
    setLeftMonth(new Date(p.range.start.getFullYear(), p.range.start.getMonth(), 1));
  };

  const handleApply = () => {
    if (!selecting.start || !selecting.end) return;
    const range: DateRange = { start: selecting.start, end: selecting.end };
    onApply(range, findBestReport(reports, range));
    setOpen(false);
  };

  const handleCancel = () => {
    setSelecting({ start: appliedRange?.start ?? null, end: appliedRange?.end ?? null });
    setOpen(false);
  };

  // Trigger label
  const fmtTrigger = (d: Date) => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
  const triggerLabel = appliedRange
    ? `${fmtTrigger(appliedRange.start)} — ${fmtTrigger(appliedRange.end)}`
    : 'Selecionar período';

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:8, padding:'7px 14px',
          borderRadius:8, background:'rgba(255,255,255,0.05)',
          border: open ? '1px solid rgba(159,232,112,0.4)' : '1px solid rgba(255,255,255,0.12)',
          color:'#EEEEE8', fontSize:12.5, cursor:'pointer',
          fontFamily:"'DM Sans', sans-serif", transition:'border-color 0.15s',
        }}
      >
        <CalendarDays style={{ width:14, height:14, color:'#9FE870', flexShrink:0 }} />
        <span>{triggerLabel}</span>
        <ChevronDown style={{ width:12, height:12, color:'#6E7A5E', flexShrink:0, transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:1000,
          background:'#0C100A', border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,0.7)',
          display:'flex', overflow:'hidden',
          fontFamily:"'DM Sans', sans-serif", minWidth: 680,
        }}>
          {/* Presets column */}
          <div style={{ width:155, padding:'12px 0', borderRight:'1px solid rgba(255,255,255,0.06)', flexShrink:0, overflowY:'auto', maxHeight:400 }}>
            {presets.map((p,i) => (
              <button key={i} onClick={() => handlePreset(p)} style={{
                display:'block', width:'100%', textAlign:'left', padding:'7px 16px',
                fontSize:12.5, background: activePreset===p.label ? 'rgba(159,232,112,0.08)' : 'transparent',
                color: activePreset===p.label ? '#9FE870' : '#EEEEE8',
                border:'none', cursor:'pointer', fontFamily:"'DM Sans', sans-serif",
              }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar area */}
          <div style={{ flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            {/* Navigation */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <button
                onClick={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#EEEEE8', cursor:'pointer', padding:'4px 10px', fontSize:16, lineHeight:1 }}
              >‹</button>
              <span style={{ fontSize:11, color:'#6E7A5E' }}>
                {MONTH_FULL[leftMonth.getMonth()].slice(0,3)} — {MONTH_FULL[rightMonth.getMonth()].slice(0,3)} {rightMonth.getFullYear()}
              </span>
              <button
                onClick={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#EEEEE8', cursor:'pointer', padding:'4px 10px', fontSize:16, lineHeight:1 }}
              >›</button>
            </div>

            {/* Two calendars */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28 }}>
              <MonthCalendar year={leftMonth.getFullYear()} month={leftMonth.getMonth()} selecting={selecting} hoverDate={hoverDate} today={today} onDateClick={handleDateClick} onDateHover={setHoverDate} />
              <MonthCalendar year={rightMonth.getFullYear()} month={rightMonth.getMonth()} selecting={selecting} hoverDate={hoverDate} today={today} onDateClick={handleDateClick} onDateHover={setHoverDate} />
            </div>

            {/* Footer */}
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10.5, color:'#6E7A5E' }}>Fuso horário: Horário de Brasília</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleCancel} style={{ padding:'7px 16px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'#EEEEE8', fontSize:12.5, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
                  Cancelar
                </button>
                <button onClick={handleApply} disabled={!selecting.start || !selecting.end} style={{ padding:'7px 20px', borderRadius:8, background:'#9FE870', border:'none', color:'#090D06', fontSize:12.5, fontWeight:700, cursor: selecting.start && selecting.end ? 'pointer' : 'not-allowed', opacity: selecting.start && selecting.end ? 1 : 0.5, fontFamily:"'DM Sans', sans-serif" }}>
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ObjType = 'messaging' | 'profile_visit' | 'video' | 'awareness' | 'conversion';

function detectCampType(c: { resultType?: string | null; objective?: string | null; name?: string }): ObjType {
  const rt  = (c.resultType  ?? '').toLowerCase();
  const nm  = (c.name        ?? '').toLowerCase();
  const obj = (c.objective   ?? '').toLowerCase();
  if (rt.includes('messaging') || rt.includes('onsite') || nm.includes('mensag') || nm.includes('inbox')) return 'messaging';
  if (rt.includes('profile_visit') || nm.includes('perfil') || nm.includes('profile')) return 'profile_visit';
  if (rt.includes('thruplay') || rt.includes('video') || nm.includes('vídeo') || nm.includes('video') || obj.includes('video_views')) return 'video';
  if (obj.includes('reach') || obj.includes('awareness') || rt.includes('reach') || nm.includes('alcance')) return 'awareness';
  return 'conversion';
}

function detectDbCampType(c: DbCampaign): ObjType {
  return detectCampType({ resultType: c.result_type, objective: c.objective, name: c.name });
}

const OBJ_META: Record<ObjType, { label: string; color: string; costLabel: string; resultLabel: string; emoji: string }> = {
  messaging:     { label: 'Mensagens',         color: '#9FE870', costLabel: 'Custo/Mensagem',  resultLabel: 'mensagens iniciadas', emoji: '💬' },
  profile_visit: { label: 'Visitas ao Perfil', color: '#60A5FA', costLabel: 'Custo/Visita',    resultLabel: 'visitas ao perfil',   emoji: '👤' },
  video:         { label: 'Vídeo / ThruPlay',  color: '#818CF8', costLabel: 'Custo/ThruPlay',  resultLabel: 'thruplays',           emoji: '▶️' },
  awareness:     { label: 'Alcance',           color: '#F97316', costLabel: 'CPM',             resultLabel: 'pessoas alcançadas',  emoji: '📡' },
  conversion:    { label: 'Conversão',         color: '#FBBF24', costLabel: 'Custo/Resultado', resultLabel: 'resultados',          emoji: '🎯' },
};

function extractVictories(aiSummary: string): string[] {
  const match = aiSummary.match(/🔥[^\n]*\n([\s\S]+?)(?:\n\n|$)/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => l.replace(/^•\s*/, '').trim())
    .filter(Boolean);
}

function computeStatus(content: ReportContent): { label: string; color: string; bg: string; border: string } {
  const freq = content.frequency ?? 0;
  const cpl  = content.totalConversions > 0 ? content.totalSpend / content.totalConversions : 0;
  if (freq > 2.8 || (cpl > 30 && content.totalConversions > 5)) {
    return { label: 'Atenção', color: '#FCD34D', bg: 'rgba(252,211,77,0.06)', border: 'rgba(252,211,77,0.2)' };
  }
  if (content.totalReach > 0 && freq < 2.5) {
    return { label: 'Em crescimento', color: '#9FE870', bg: 'rgba(159,232,112,0.06)', border: 'rgba(159,232,112,0.2)' };
  }
  return { label: 'Estável', color: '#60A5FA', bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.2)' };
}

function generateSummary(content: ReportContent, camps: ReportCampaign[]): string {
  const msgCamps   = camps.filter(c => detectCampType(c) === 'messaging');
  const visitCamps = camps.filter(c => detectCampType(c) === 'profile_visit');
  const totalMsg   = msgCamps.reduce((s, c) => s + c.conversions, 0);
  const totalVisit = visitCamps.reduce((s, c) => s + c.conversions, 0);
  const freq       = content.frequency ?? 0;

  if (totalMsg > 0) {
    const cpl = msgCamps.reduce((s, c) => s + c.spend, 0) / totalMsg;
    return `No período geramos ${num(totalMsg)} mensagens com custo médio de ${brl(cpl)}, alcançando ${num(content.totalReach)} pessoas com frequência de ${freq.toFixed(1)}x.`;
  }
  if (totalVisit > 0) {
    const cpl = visitCamps.reduce((s, c) => s + c.spend, 0) / totalVisit;
    return `No período geramos ${num(totalVisit)} visitas ao perfil com custo de ${brl(cpl)}, alcançando ${num(content.totalReach)} pessoas.`;
  }
  if (content.totalReach > 0) {
    return `No período alcançamos ${num(content.totalReach)} pessoas únicas com ${num(content.totalImpressions)} impressões, frequência ${freq.toFixed(1)}x e investimento de ${brl(content.totalSpend)}.`;
  }
  return `${brl(content.totalSpend)} investidos gerando ${num(content.totalImpressions)} impressões e ${num(content.totalReach)} pessoas alcançadas.`;
}

function generateActivities(camps: ReportCampaign[]): string[] {
  const types = new Set(camps.map(c => detectCampType(c)));
  const acts: string[] = [];
  if (types.has('messaging'))     acts.push('Campanhas de conversão em mensagens');
  if (types.has('profile_visit')) acts.push('Campanha de visitas ao perfil');
  if (types.has('video'))         acts.push('Campanha de vídeo e ThruPlays');
  if (types.has('awareness'))     acts.push('Campanha de reconhecimento e audiência');
  if (camps.length > 2)           acts.push(`${camps.length} campanhas gerenciadas simultaneamente`);
  acts.push('Monitoramento e otimização contínuos');
  return acts.slice(0, 5);
}


function computeComparison(
  current: ReportContent,
  previous: ReportContent | null
): Array<{ label: string; direction: 'up' | 'down' | 'same'; note: string }> {
  if (!previous) return [];
  const out: Array<{ label: string; direction: 'up' | 'down' | 'same'; note: string }> = [];
  if (previous.totalReach > 0 && current.totalReach > 0) {
    const pct = ((current.totalReach - previous.totalReach) / previous.totalReach) * 100;
    out.push({ label: 'Alcance', direction: pct > 5 ? 'up' : pct < -5 ? 'down' : 'same', note: pct > 0 ? `+${pct.toFixed(0)}% vs anterior` : `${pct.toFixed(0)}% vs anterior` });
  }
  if (previous.totalConversions > 0 && current.totalConversions > 0) {
    const pct = ((current.totalConversions - previous.totalConversions) / previous.totalConversions) * 100;
    out.push({ label: 'Resultados', direction: pct > 5 ? 'up' : pct < -5 ? 'down' : 'same', note: pct > 0 ? `+${pct.toFixed(0)}% vs anterior` : `${pct.toFixed(0)}% vs anterior` });
  }
  const currCpl = current.totalConversions > 0 ? current.totalSpend / current.totalConversions : 0;
  const prevCpl = previous.totalConversions > 0 ? previous.totalSpend / previous.totalConversions : 0;
  if (currCpl > 0 && prevCpl > 0) {
    const pct = ((currCpl - prevCpl) / prevCpl) * 100;
    out.push({ label: 'Custo por resultado', direction: pct < -5 ? 'up' : pct > 5 ? 'down' : 'same', note: pct < 0 ? `${pct.toFixed(0)}% (melhorou)` : pct > 0 ? `+${pct.toFixed(0)}% (subiu)` : 'Estável' });
  }
  return out;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 3, color: '#9FE870', textTransform: 'uppercase' as const, marginBottom: 12, fontWeight: 600 }}>
      {children}
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-5 flex flex-col gap-2" style={CARD_STYLE}>
      <div className="flex items-center gap-2" style={{ color: '#6E7A5E' }}>
        {icon}
        <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#EEEEE8', fontWeight: 400, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function SpendBar({ pct, color = '#9FE870' }: { pct: number; color?: string }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}>
      <div className="rounded-full" style={{ width: `${Math.min(pct, 100)}%`, height: 3, background: color }} />
    </div>
  );
}

function ObjBadge({ type }: { type: ObjType }) {
  const meta = OBJ_META[type];
  return (
    <span
      className="rounded-full px-2 py-0.5"
      style={{ fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, letterSpacing: 0.5 }}
    >
      {meta.emoji} {meta.label}
    </span>
  );
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ camp, totalSpend }: { camp: ReportCampaign; totalSpend: number }) {
  const type   = detectCampType(camp);
  const meta   = OBJ_META[type];
  const spendPct = totalSpend > 0 ? (camp.spend / totalSpend) * 100 : 0;
  const cpr    = camp.conversions > 0 ? camp.spend / camp.conversions : 0;
  const isAwareness = type === 'awareness';

  return (
    <div className="p-4 flex flex-col gap-3" style={CARD_STYLE}>
      <div className="flex items-start justify-between gap-2">
        <div className="truncate" style={{ color: '#EEEEE8', fontSize: 14, fontWeight: 500, flex: 1 }}>
          {camp.name}
        </div>
        <ObjBadge type={type} />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", color: meta.color, lineHeight: 1 }}>
            {isAwareness ? num(camp.reach) : num(camp.conversions)}
          </div>
          <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 2 }}>
            {isAwareness ? 'alcance' : meta.resultLabel}
          </div>
        </div>
        <div className="text-right">
          {!isAwareness && cpr > 0 && (
            <>
              <div style={{ fontSize: 13, color: '#EEEEE8' }}>{brl(cpr)}</div>
              <div style={{ fontSize: 10, color: '#6E7A5E' }}>{meta.costLabel}</div>
            </>
          )}
          {isAwareness && camp.impressions > 0 && (
            <>
              <div style={{ fontSize: 13, color: '#EEEEE8' }}>{brl((camp.spend / camp.impressions) * 1000)}</div>
              <div style={{ fontSize: 10, color: '#6E7A5E' }}>CPM</div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div style={{ fontSize: 12, color: '#6E7A5E' }}>{brl(camp.spend)}</div>
        <div style={{ fontSize: 10, color: '#6E7A5E' }}>{spendPct.toFixed(0)}%</div>
      </div>
      <SpendBar pct={spendPct} color={meta.color} />
    </div>
  );
}

// ─── DbCampaign Card ───────────────────────────────────────────────────────────

function DbCampaignCard({ camp, totalSpend }: { camp: DbCampaign; totalSpend: number }) {
  const type   = detectDbCampType(camp);
  const meta   = OBJ_META[type];
  const spendPct = totalSpend > 0 ? (camp.spend / totalSpend) * 100 : 0;
  const cpr    = camp.conversions > 0 ? camp.spend / camp.conversions : 0;
  const isAwareness = type === 'awareness';

  return (
    <div className="p-4 flex flex-col gap-3" style={CARD_STYLE}>
      <div className="flex items-start justify-between gap-2">
        <div className="truncate" style={{ color: '#EEEEE8', fontSize: 14, fontWeight: 500, flex: 1 }}>
          {camp.name}
        </div>
        <ObjBadge type={type} />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", color: meta.color, lineHeight: 1 }}>
            {isAwareness ? num(camp.reach) : num(camp.conversions)}
          </div>
          <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 2 }}>
            {isAwareness ? 'alcance' : meta.resultLabel}
          </div>
        </div>
        <div className="text-right">
          {!isAwareness && cpr > 0 && (
            <>
              <div style={{ fontSize: 13, color: '#EEEEE8' }}>{brl(cpr)}</div>
              <div style={{ fontSize: 10, color: '#6E7A5E' }}>{meta.costLabel}</div>
            </>
          )}
          {isAwareness && camp.impressions > 0 && (
            <>
              <div style={{ fontSize: 13, color: '#EEEEE8' }}>{brl((camp.spend / camp.impressions) * 1000)}</div>
              <div style={{ fontSize: 10, color: '#6E7A5E' }}>CPM</div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div style={{ fontSize: 12, color: '#6E7A5E' }}>{brl(camp.spend)}</div>
        <div style={{ fontSize: 10, color: '#6E7A5E' }}>{spendPct.toFixed(0)}%</div>
      </div>
      <SpendBar pct={spendPct} color={meta.color} />
    </div>
  );
}

// ─── Tab 1: Último Período ─────────────────────────────────────────────────────

function TabUltimoPeriodo({ report, prevReport }: { report: ClientReport | null; prevReport: ClientReport | null }) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ color: '#EEEEE8', fontSize: 18, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>
          Relatório em preparação
        </div>
        <div style={{ color: '#6E7A5E', fontSize: 14, lineHeight: 1.7, maxWidth: 360 }}>
          Seu primeiro relatório está sendo preparado. Em breve você terá acesso aqui.
        </div>
      </div>
    );
  }

  const latest  = report;
  const prev    = prevReport;
  const content = latest.content_json as ReportContent;
  const prevContent = prev ? (prev.content_json as ReportContent) : null;
  const camps   = content.campaigns ?? [];
  const numDays = content.numDays ?? 30;
  const status  = computeStatus(content);
  const freq    = content.frequency ?? 0;

  // Group camps by objective type
  const campsByType = new Map<ObjType, ReportCampaign[]>();
  for (const c of camps) {
    const t = detectCampType(c);
    if (!campsByType.has(t)) campsByType.set(t, []);
    campsByType.get(t)!.push(c);
  }

  // Victories
  let victories = content.ai_summary ? extractVictories(content.ai_summary) : [];
  if (victories.length === 0) {
    const totalMsg = camps.filter(c => detectCampType(c) === 'messaging').reduce((s, c) => s + c.conversions, 0);
    if (totalMsg > 0) victories.push(`${num(totalMsg)} conversões em mensagens geradas no período`);
    if (content.totalReach > 1000) victories.push(`${num(content.totalReach)} pessoas únicas alcançadas`);
    if (freq > 0 && freq < 2.5) victories.push(`Frequência saudável de ${freq.toFixed(1)}x — audiência bem renovada`);
  }

  const activities  = generateActivities(camps);
  const comparison  = computeComparison(content, prevContent);
  const topCamps    = [...camps].filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 4);
  const totalSpend  = content.totalSpend ?? 0;

  // Dominant type
  let dominantType: ObjType = 'conversion';
  let dominantMax = 0;
  campsByType.forEach((cs, t) => {
    const spend = cs.reduce((s, c) => s + c.spend, 0);
    if (spend > dominantMax) { dominantMax = spend; dominantType = t; }
  });
  const domMeta = OBJ_META[dominantType];

  return (
    <div className="flex flex-col gap-6">

      {/* A: Period header bar */}
      <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ ...CARD_STYLE }}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 10, letterSpacing: 2, color: '#6E7A5E', textTransform: 'uppercase' as const }}>
              {periodTypeLabel(numDays)}
            </span>
            <span style={{ fontSize: 10, color: '#6E7A5E' }}>·</span>
            <span style={{ fontSize: 13, color: '#EEEEE8' }}>
              {fmtDate(latest.period_start)} → {fmtDate(latest.period_end)}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5"
              style={{ fontSize: 10, fontWeight: 600, color: status.color, background: status.bg, border: `1px solid ${status.border}`, letterSpacing: 0.5 }}
            >
              {status.label}
            </span>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: '#9FE870', fontWeight: 400, lineHeight: 1 }}>
            {brl(totalSpend)}
          </div>
          <div style={{ fontSize: 11, color: '#6E7A5E' }}>investimento no período</div>
          {(() => {
            const displayName = (latest.content_json as { display_name?: string } | null)?.display_name;
            return displayName ? (
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: '#9FA8A0', textTransform: 'capitalize' as const, marginTop: 2 }}>
                {displayName}
              </div>
            ) : null;
          })()}
        </div>
        <a
          href={`/api/reports/html/${latest.id}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl self-start sm:self-auto"
          style={{ background: 'rgba(159,232,112,0.1)', border: '1px solid rgba(159,232,112,0.25)', color: '#9FE870', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
        >
          Ver relatório completo <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* B: Status geral */}
      <div className="p-5 flex items-center gap-4" style={{ ...CARD_STYLE, background: status.bg, border: `1px solid ${status.border}` }}>
        <div
          className="rounded-full shrink-0"
          style={{ width: 12, height: 12, background: status.color, boxShadow: `0 0 10px ${status.color}60` }}
        />
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: status.color, textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 2 }}>
            Status Geral
          </div>
          <div style={{ fontSize: 18, color: '#EEEEE8', fontFamily: "'Cormorant Garamond', serif" }}>
            {status.label}
          </div>
        </div>
      </div>

      {/* C: Resumo em 10 segundos */}
      <div className="p-5" style={CARD_STYLE}>
        <SectionLabel>Resumo do Período</SectionLabel>
        <p style={{ fontSize: 17, color: '#EEEEE8', lineHeight: 1.7, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
          {generateSummary(content, camps)}
        </p>
      </div>

      {/* D: Objetivo do período */}
      <div className="p-5" style={CARD_STYLE}>
        <SectionLabel>Objetivo do Período</SectionLabel>
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28 }}>{domMeta.emoji}</span>
          <div>
            <div style={{ color: domMeta.color, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{domMeta.label}</div>
            <div style={{ color: '#6E7A5E', fontSize: 13, lineHeight: 1.6 }}>
              Foco principal: {domMeta.resultLabel}
            </div>
          </div>
          <div className="ml-auto">
            <span
              className="rounded-full px-3 py-1"
              style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
            >
              {status.label === 'Em crescimento' ? 'Em evolução' : status.label === 'Estável' ? 'Dentro do esperado' : 'Atenção necessária'}
            </span>
          </div>
        </div>
      </div>

      {/* E: Resultados por objetivo */}
      {campsByType.size > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel>Resultados por Objetivo</SectionLabel>
          {Array.from(campsByType.entries()).map(([type, cs]) => {
            const meta       = OBJ_META[type];
            const isAwareness = type === 'awareness';
            const totalConv   = cs.reduce((s, c) => s + c.conversions, 0);
            const totalSpendG = cs.reduce((s, c) => s + c.spend, 0);
            const totalReach  = cs.reduce((s, c) => s + c.reach, 0);
            const totalImpr   = cs.reduce((s, c) => s + c.impressions, 0);
            const cpr         = totalConv > 0 ? totalSpendG / totalConv : 0;
            const cpm         = totalImpr > 0 ? (totalSpendG / totalImpr) * 1000 : 0;

            return (
              <div key={type} className="p-5" style={{ ...CARD_STYLE, borderLeft: `3px solid ${meta.color}` }}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                    <span style={{ color: meta.color, fontSize: 15, fontWeight: 600 }}>{meta.label}</span>
                  </div>
                  <span style={{ color: '#6E7A5E', fontSize: 12 }}>{cs.length} campanha{cs.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {isAwareness ? (
                    <>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: '#EEEEE8', lineHeight: 1 }}>{num(totalReach)}</div>
                        <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 3 }}>pessoas alcançadas</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: '#EEEEE8', lineHeight: 1 }}>{num(totalImpr)}</div>
                        <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 3 }}>impressões</div>
                      </div>
                      {cpm > 0 && (
                        <div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: '#EEEEE8', lineHeight: 1 }}>{brl(cpm)}</div>
                          <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 3 }}>CPM</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: meta.color, lineHeight: 1 }}>{num(totalConv)}</div>
                        <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 3 }}>{meta.resultLabel}</div>
                      </div>
                      {cpr > 0 && (
                        <div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: '#EEEEE8', lineHeight: 1 }}>{brl(cpr)}</div>
                          <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 3 }}>{meta.costLabel}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: '#EEEEE8', lineHeight: 1 }}>{brl(totalSpendG)}</div>
                        <div style={{ fontSize: 10, color: '#6E7A5E', marginTop: 3 }}>investido</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* F: KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Investimento" value={brl(totalSpend)} icon={<Zap className="w-3.5 h-3.5" />} />
        <KpiCard label="Alcance" value={num(content.totalReach)} icon={<Users className="w-3.5 h-3.5" />} />
        <KpiCard label="Impressões" value={num(content.totalImpressions)} icon={<Eye className="w-3.5 h-3.5" />} />
        <KpiCard label="Frequência" value={`${freq.toFixed(2)}x`} icon={<BarChart2 className="w-3.5 h-3.5" />} />
      </div>

      {/* G: Campanhas em destaque */}
      {topCamps.length > 0 && (
        <div>
          <SectionLabel>Campanhas em Destaque</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {topCamps.map((c, i) => (
              <CampaignCard key={i} camp={c} totalSpend={totalSpend} />
            ))}
          </div>
        </div>
      )}

      {/* H: Micro vitórias */}
      {victories.length > 0 && (
        <div className="p-5" style={CARD_STYLE}>
          <SectionLabel>Micro Vitórias</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {victories.map((v, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#9FE870' }} />
                <span style={{ color: '#EEEEE8', fontSize: 14, lineHeight: 1.5 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* I: O que foi feito */}
      <div className="p-5" style={CARD_STYLE}>
        <SectionLabel>O Que Foi Feito</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {activities.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span style={{ color: '#6E7A5E', fontSize: 14, marginTop: 1 }}>—</span>
              <span style={{ color: '#EEEEE8', fontSize: 14, lineHeight: 1.5 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* J: Comparação com período anterior */}
      {comparison.length > 0 && (
        <div className="p-5" style={CARD_STYLE}>
          <SectionLabel>Comparação com Período Anterior</SectionLabel>
          <div className="flex flex-col gap-3">
            {comparison.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: i < comparison.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ color: '#6E7A5E', fontSize: 13 }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: '#EEEEE8', fontSize: 13 }}>{item.note}</span>
                  {item.direction === 'up' && <TrendingUp className="w-4 h-4" style={{ color: '#9FE870' }} />}
                  {item.direction === 'down' && <TrendingDown className="w-4 h-4" style={{ color: '#EF4444' }} />}
                  {item.direction === 'same' && <Minus className="w-4 h-4" style={{ color: '#6E7A5E' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Relatórios ─────────────────────────────────────────────────────────

function TabRelatorios({ reports }: { reports: ClientReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <div style={{ color: '#6E7A5E', fontSize: 14, lineHeight: 1.7 }}>
          Nenhum relatório disponível ainda.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r, idx) => {
        const content  = r.content_json as ReportContent;
        const numDays  = content?.numDays ?? 30;
        const spend    = content?.totalSpend ?? 0;
        const isLatest = idx === 0;

        return (
          <a
            key={r.id}
            href={`/api/reports/html/${r.id}`}
            style={{
              ...CARD_STYLE,
              ...(isLatest ? { background: 'rgba(159,232,112,0.05)', border: '1px solid rgba(159,232,112,0.25)' } : {}),
              textDecoration: 'none',
              display: 'block',
            }}
            className="p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isLatest && (
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#090D06', background: '#9FE870', textTransform: 'uppercase' as const }}
                    >
                      Atual
                    </span>
                  )}
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ fontSize: 10, color: '#6E7A5E', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {periodTypeLabel(numDays)}
                  </span>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isLatest ? 24 : 20, color: isLatest ? '#EEEEE8' : '#9FA8A0', textTransform: 'capitalize' as const }}>
                  {(r.content_json as { display_name?: string } | null)?.display_name ?? monthLabel(r.period_start)}
                </div>
                <div style={{ fontSize: 12, color: '#6E7A5E' }}>
                  {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {spend > 0 && (
                  <div className="text-right">
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isLatest ? 22 : 18, color: isLatest ? '#9FE870' : '#6E7A5E' }}>
                      {brl(spend)}
                    </div>
                    <div style={{ fontSize: 10, color: '#6E7A5E' }}>investimento</div>
                  </div>
                )}
                <ArrowRight className="w-4 h-4" style={{ color: isLatest ? '#9FE870' : '#6E7A5E' }} />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ─── Tab 3: Campanhas ──────────────────────────────────────────────────────────

function TabCampanhas({ dbCampaigns, csvCampaigns }: { dbCampaigns: DbCampaign[]; csvCampaigns: DbCampaign[] }) {
  // Prefer DB campaigns if available; otherwise use campaigns from latest CSV report
  const source = dbCampaigns.filter(c => c.spend > 0).length > 0
    ? dbCampaigns
    : csvCampaigns;

  const active = source.filter(c => c.spend > 0);
  const totalSpend = active.reduce((s, c) => s + c.spend, 0);

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
        <div style={{ color: '#EEEEE8', fontSize: 16, marginBottom: 8 }}>Nenhuma campanha encontrada</div>
        <div style={{ color: '#6E7A5E', fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>
          As campanhas aparecerão aqui após o primeiro relatório ser publicado.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>{active.length} Campanhas Ativas</SectionLabel>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#9FE870' }}>
          {brl(totalSpend)} total
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((c, i) => (
          <DbCampaignCard key={i} camp={c} totalSpend={totalSpend} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PortalClientPage({
  client,
  reports,
  dbCampaigns,
}: {
  client: ClientInfo;
  reports: ClientReport[];
  dbCampaigns: DbCampaign[];
}) {
  const [activeTab, setActiveTab] = useState<'periodo' | 'relatorios' | 'campanhas'>('periodo');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(() => {
    if (!reports.length) return null;
    const r = reports[0];
    return {
      start: new Date(r.period_start + 'T12:00:00'),
      end: new Date(r.period_end + 'T12:00:00'),
    };
  });

  const handleRangeApply = (range: DateRange, idx: number) => {
    setAppliedRange(range);
    setSelectedIdx(idx);
  };

  // Extract campaigns from the latest CSV report as fallback when DB campaigns are empty
  const csvCampaigns: DbCampaign[] = ((reports[0]?.content_json as ReportContent | null)?.campaigns ?? []).map(c => ({
    name: c.name,
    status: c.status,
    objective: c.objective ?? null,
    result_type: c.resultType ?? null,
    spend: c.spend,
    impressions: c.impressions,
    conversions: c.conversions,
    reach: c.reach,
    budget: c.budget ?? null,
  }));

  const avatarLetter = client.initials ?? client.name.charAt(0).toUpperCase();
  const avatarColor  = client.color ?? '#9FE870';

  const tabs: { id: 'periodo' | 'relatorios' | 'campanhas'; label: string }[] = [
    { id: 'periodo',    label: 'Último Período' },
    { id: 'relatorios', label: 'Relatórios' },
    { id: 'campanhas',  label: 'Campanhas' },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ background: '#090D06', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#EEEEE8' }}>

        {/* Client identity header */}
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center gap-4">
            {client.avatar_url ? (
              <img
                src={client.avatar_url}
                alt={client.name}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div
                className="shrink-0 rounded-full flex items-center justify-center font-bold"
                style={{ width: 64, height: 64, background: avatarColor, color: '#090D06', fontSize: 22, letterSpacing: 1 }}
              >
                {avatarLetter}
              </div>
            )}
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#EEEEE8', fontWeight: 400, lineHeight: 1.1 }}>
                {client.name}
              </div>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#9FE870', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>
                Portal de Resultados
              </div>
              {client.segment && (
                <div style={{ fontSize: 12, color: '#6E7A5E', marginTop: 2 }}>{client.segment}</div>
              )}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div
          className="sticky top-16 z-40 flex gap-0 px-4"
          style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="max-w-2xl mx-auto w-full flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-4 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? '#9FE870' : '#6E7A5E',
                  borderBottom: activeTab === tab.id ? '2px solid #9FE870' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date picker bar — only in período tab */}
        {activeTab === 'periodo' && reports.length > 0 && (
          <div style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              <DateRangePicker
                reports={reports}
                appliedRange={appliedRange}
                onApply={handleRangeApply}
              />
              {selectedIdx > 0 && (
                <span style={{ fontSize:11, color:'#6E7A5E' }}>
                  Exibindo relatório de {fmtDate(reports[selectedIdx].period_start)} a {fmtDate(reports[selectedIdx].period_end)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          {activeTab === 'periodo'    && <TabUltimoPeriodo report={reports[selectedIdx] ?? null} prevReport={reports[selectedIdx + 1] ?? null} />}
          {activeTab === 'relatorios' && <TabRelatorios reports={reports} />}
          {activeTab === 'campanhas'  && <TabCampanhas dbCampaigns={dbCampaigns} csvCampaigns={csvCampaigns} />}
        </div>

      </div>
    </>
  );
}
