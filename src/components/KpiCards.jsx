import React, { useState, useEffect } from 'react';
import { Droplets, CalendarDays, Award, BarChart3 } from 'lucide-react';
import { formatDateBR, MONTHS_SAFRA } from '../utils/dates';
import { getDefaultMonth } from '../data/calculations';

const fmt = (n, digits = 1) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (pct) => `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;

// Média histórica esperada até hoje para a safra (meses encerrados inteiros + fração do mês corrente)
function expectedToDate(safraMetrics, historicalMonthAvg) {
  if (!safraMetrics) return null;
  let sum = 0;
  let any = false;
  for (const m of MONTHS_SAFRA) {
    const month = safraMetrics.months[m.code];
    const hist = historicalMonthAvg?.[m.code];
    if (!month || hist == null) continue;
    if (month.status === 'past') { sum += hist; any = true; }
    else if (month.status === 'current') { sum += hist * (month.elapsedDays / month.daysInMonth); any = true; }
  }
  return any ? Math.round(sum * 10) / 10 : null;
}

function Card({ i, children }) {
  return (
    <div className="panel lift p-5 flex flex-col min-h-[196px] enter" style={{ '--i': i }}>
      {children}
    </div>
  );
}

function CardHead({ icon: Icon, label, tone = 'text-accent-text', aside }) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-[24px] mb-2">
      <span className={`lbl flex items-center gap-1.5 whitespace-nowrap ${tone}`}>
        <Icon className="w-4 h-4" strokeWidth={2.2} />
        {label}
      </span>
      {aside}
    </div>
  );
}

function Value({ value, unit, unitTone = 'text-accent-text' }) {
  return (
    <div className="flex items-baseline gap-2 mt-0.5 mb-3">
      <span className="num t-kpi-value text-ink-strong text-[30px] leading-[34px] sm:text-[34px] sm:leading-[38px]">{value}</span>
      <span className={`text-[15px] font-bold ${unitTone}`}>{unit}</span>
    </div>
  );
}

function Foot({ children }) {
  return <div className="mt-auto pt-3 border-t border-line space-y-1.5 text-[13px] leading-[18px] text-ink-muted">{children}</div>;
}

const Row = ({ children }) => <div className="flex items-center justify-between gap-3">{children}</div>;
const B = ({ children, className = '' }) => <b className={`num font-semibold text-ink-strong ${className}`}>{children}</b>;

function Delta({ pct }) {
  if (pct == null || !Number.isFinite(pct)) return null;
  return <span className={`num font-bold whitespace-nowrap ${pct >= 0 ? 'text-success' : 'text-warning'}`}>{signed(pct)}</span>;
}

// ---------- 1. Acumulado da safra, com a régua da média histórica ----------
function AccumulatedCard({ metrics, selectedSafra, historicalMonthAvg }) {
  const expected = expectedToDate(metrics, historicalMonthAvg);
  const fullSeason = Object.values(historicalMonthAvg || {}).reduce((a, b) => a + (b || 0), 0);
  const pct = expected > 0 ? Math.round(((metrics.total_mm - expected) / expected) * 100) : null;
  const progress = fullSeason > 0 ? Math.min(100, (metrics.total_mm / fullSeason) * 100) : 0;
  const expectedMark = fullSeason > 0 && expected ? Math.min(100, (expected / fullSeason) * 100) : null;

  return (
    <Card i={1}>
      <CardHead icon={Droplets} label="Acumulado da safra" aside={<span className="chip num">{selectedSafra}</span>} />
      <Value value={fmt(metrics.total_mm)} unit="mm" />
      {fullSeason > 0 && (
        <div className="mb-3" title={`Média de uma safra completa: ${fmt(fullSeason)} mm`}>
          <div className="relative h-1.5 rounded-full bg-surface-control overflow-visible">
            <div className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
            {expectedMark != null && <span className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink-strong/70" style={{ left: `${expectedMark}%`, backgroundColor: 'var(--ink-strong)' }} />}
          </div>
          <p className="text-[11px] leading-[14px] text-ink-muted mt-1.5 num">{Math.round(progress)}% da média de uma safra ({fmt(fullSeason, 0)} mm)</p>
        </div>
      )}
      <Foot>
        <Row><span>Dias com chuva: <B>{metrics.rainy_days}</B></span>{metrics.max_day.rain_mm > 0 && <span>Maior dia: <B>{fmt(metrics.max_day.rain_mm)} mm</B></span>}</Row>
        {expected != null && <Row><span>Média até hoje: <B>{fmt(expected)} mm</B></span><Delta pct={pct} /></Row>}
      </Foot>
    </Card>
  );
}

// ---------- 2. Média diária do mês (com seletor de mês e safra) ----------
function MonthlyAverageCard({ selectedSafra, safraMetricsMap, availableSafras, historicalMonthAvg }) {
  const defaultMonthCode = getDefaultMonth(safraMetricsMap[selectedSafra])?.code || 'OUT';
  const [safra, setSafra] = useState(selectedSafra);
  const [monthCode, setMonthCode] = useState(defaultMonthCode);

  // Ao trocar a safra no topo do painel, o card volta ao mês padrão dessa safra
  useEffect(() => {
    setSafra(selectedSafra);
    setMonthCode(defaultMonthCode);
  }, [selectedSafra, defaultMonthCode]);

  const month = safraMetricsMap[safra]?.months?.[monthCode];
  const isCurrent = month?.status === 'current';
  const isFuture = month?.isFuture;
  const histTotal = historicalMonthAvg?.[monthCode];
  const histDaily = month && histTotal != null ? histTotal / month.daysInMonth : null;
  // No mês em andamento, compara pelo ritmo até hoje (média dos dias decorridos)
  const compareDaily = isCurrent ? month?.average_mm_day_elapsed : month?.average_mm_day;
  const deviation = histDaily > 0 && !isFuture ? Math.round(((compareDaily - histDaily) / histDaily) * 100) : null;

  const sel = 'num h-6 rounded-full border border-line bg-surface-control pl-2 pr-1 text-[12px] font-bold text-accent-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]';

  return (
    <Card i={2}>
      <CardHead
        icon={CalendarDays}
        label="Média diária"
        aside={
          <span className="flex items-center gap-1">
            <select aria-label="Mês" value={monthCode} onChange={(e) => setMonthCode(e.target.value)} className={sel}>
              {MONTHS_SAFRA.map(m => <option key={m.code} value={m.code}>{m.shortName}</option>)}
            </select>
            <select aria-label="Safra" value={safra} onChange={(e) => setSafra(e.target.value)} className={sel}>
              {availableSafras.map(s => <option key={s} value={s}>{s.replace(/^\d{2}(\d{2})\/\d{2}(\d{2})$/, '$1/$2')}</option>)}
            </select>
          </span>
        }
      />
      {isFuture ? (
        <div className="mt-1 mb-3 min-h-[38px] flex items-center">
          <span className="text-[15px] font-semibold text-ink-muted">{month?.name} de {month?.year} ainda não começou</span>
        </div>
      ) : (
        <>
          <Value value={fmt(month?.average_mm_day, 2)} unit="mm/dia" />
          {isCurrent && (
            <p className="text-[12px] leading-4 text-ink-muted -mt-2 mb-3 num">
              Até hoje: <B>{fmt(month.average_mm_day_elapsed, 2)} mm/dia</B> ({month.elapsedDays} de {month.daysInMonth} dias)
            </p>
          )}
        </>
      )}
      <Foot>
        <Row><span className="num">Cálculo: <B>{fmt(month?.total_mm)} mm</B> ÷ <B>{month?.daysInMonth || 30} dias</B></span></Row>
        {histDaily != null && <Row><span>Média histórica: <B>{fmt(histDaily, 2)} mm/dia</B></span><Delta pct={deviation} /></Row>}
      </Foot>
    </Card>
  );
}

// ---------- 3. Recorde diário ----------
function RecordCard({ kpis }) {
  const rec = kpis?.recordDay;
  return (
    <Card i={3}>
      <CardHead icon={Award} label="Recorde diário" tone="text-warning" aside={<span className="chip">Histórico</span>} />
      <Value value={rec?.rain_mm ? fmt(rec.rain_mm) : '—'} unit="mm em 24 h" />
      <Foot>
        <Row><span>Data: <B>{rec?.date ? formatDateBR(rec.date) : '—'}</B></span><span>Safra <B>{rec?.safra || '—'}</B></span></Row>
        <Row><span>Registros na base: <B>{(kpis?.totalRecords || 0).toLocaleString('pt-BR')}</B></span></Row>
      </Foot>
    </Card>
  );
}

// ---------- 4. Safras lado a lado (a mais chuvosa e a mais seca, em barras) ----------
function ExtremesCard({ kpis, selectedSafra }) {
  const list = kpis?.safrasSummary || [];
  const max = Math.max(1, ...list.map(s => s.total_mm));
  return (
    <Card i={4}>
      <CardHead icon={BarChart3} label="Safras lado a lado" aside={<span className="chip num">{list.length} safras</span>} />
      <ul className="space-y-[7px] mt-1 mb-3">
        {list.map((s) => {
          const isWettest = s.safra === kpis?.wettestSafra?.safra;
          const isDriest = s.safra === kpis?.driestSafra?.safra;
          const isSel = s.safra === selectedSafra;
          return (
            <li key={s.safra} className="grid grid-cols-[52px_1fr_auto] items-center gap-2 text-[12px] leading-4">
              <span className={`num ${isSel ? 'font-bold text-accent-text' : 'text-ink-muted'}`}>{s.safra.replace(/^\d{2}(\d{2})\/\d{2}(\d{2})$/, '$1/$2')}</span>
              <span className="h-2 rounded-full bg-surface-control overflow-hidden">
                <span className={`block h-full rounded-full transition-[width] duration-700 ease-out ${isSel ? 'bg-accent' : 'bg-petrol-300 dark:bg-petrol-600'}`} style={{ width: `${(s.total_mm / max) * 100}%` }} />
              </span>
              <span className="num text-right text-ink-strong font-semibold min-w-[64px]">
                {fmt(s.total_mm, 0)}
                {isWettest && <span className="ml-1 text-success font-bold" title="Safra mais chuvosa">▲</span>}
                {isDriest && <span className="ml-1 text-warning font-bold" title="Safra mais seca (encerradas)">▼</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <Foot>
        <Row><span>Total histórico: <B>{fmt(kpis?.totalHistoricalRain, 0)} mm</B></span><span><B>{kpis?.totalHistoricalRainyDays}</B> dias</span></Row>
      </Foot>
    </Card>
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="panel p-5 min-h-[196px] space-y-3">
          <span className="skeleton block h-4 w-2/5" />
          <span className="skeleton block h-9 w-3/5" />
          <span className="skeleton block h-3 w-full mt-8" />
          <span className="skeleton block h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export default function KpiCards({ currentSafraMetrics, kpis, selectedSafra, safraMetricsMap = {}, availableSafras = [], historicalMonthAvg = {} }) {
  if (!currentSafraMetrics) return <KpiSkeleton />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <AccumulatedCard metrics={currentSafraMetrics} selectedSafra={selectedSafra} historicalMonthAvg={historicalMonthAvg} />
      <MonthlyAverageCard selectedSafra={selectedSafra} safraMetricsMap={safraMetricsMap} availableSafras={availableSafras} historicalMonthAvg={historicalMonthAvg} />
      <RecordCard kpis={kpis} />
      <ExtremesCard kpis={kpis} selectedSafra={selectedSafra} />
    </div>
  );
}
