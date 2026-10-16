import React, { useState, useEffect } from 'react';
import { Droplets, Calendar, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateBR, MONTHS_SAFRA } from '../utils/dates';
import { getDefaultMonth } from '../data/calculations';

const fmt = (n, digits = 2) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

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

  const selectClass = 'text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 pl-1.5 pr-0.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800/50 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer';

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 relative overflow-hidden group flex flex-col">
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition pointer-events-none"></div>

      <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 mb-2 min-h-[24px]">
        <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          Média Diária
        </span>
        <div className="flex items-center gap-1 relative">
          <select aria-label="Mês" value={monthCode} onChange={(e) => setMonthCode(e.target.value)} className={selectClass}>
            {MONTHS_SAFRA.map(m => <option key={m.code} value={m.code}>{m.shortName}</option>)}
          </select>
          <select aria-label="Safra" value={safra} onChange={(e) => setSafra(e.target.value)} className={selectClass}>
            {availableSafras.map(s => <option key={s} value={s}>{s.replace(/^\d{2}(\d{2})\/\d{2}(\d{2})$/, '$1/$2')}</option>)}
          </select>
        </div>
      </div>

      {isFuture ? (
        <div className="flex items-baseline gap-2 mt-1 mb-3">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
            {month?.name} de {month?.year} ainda não começou
          </span>
        </div>
      ) : (
        <div className="mt-1 mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
              {fmt(month?.average_mm_day)}
            </span>
            <span className="text-sm font-bold text-sky-600 dark:text-sky-400">mm / dia</span>
          </div>
          {isCurrent && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Até hoje: <strong className="text-slate-700 dark:text-slate-200">{fmt(month.average_mm_day_elapsed)} mm/dia</strong> ({month.elapsedDays} de {month.daysInMonth} dias)
            </p>
          )}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">
            Cálculo: <strong className="text-slate-700 dark:text-slate-200">{fmt(month?.total_mm, 1)} mm</strong> ÷ <strong className="text-slate-700 dark:text-slate-200">{month?.daysInMonth || 30} dias</strong>
          </span>
        </div>
        {histDaily != null && (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">Média histórica: <strong className="text-slate-700 dark:text-slate-200">{fmt(histDaily)} mm/dia</strong></span>
            {deviation != null && (
              <span className={`font-bold whitespace-nowrap ${deviation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {deviation > 0 ? '+' : ''}{deviation}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KpiCards({ currentSafraMetrics, kpis, selectedSafra, safraMetricsMap = {}, availableSafras = [], historicalMonthAvg = {} }) {
  if (!currentSafraMetrics) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      {/* CARD 1: Acumulado da Safra Atual */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 relative overflow-hidden group flex flex-col">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rain-500/10 rounded-full blur-2xl group-hover:bg-rain-500/20 transition"></div>
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 mb-2 min-h-[24px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-rain-600 dark:text-rain-400 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-rain-500 dark:text-rain-400" />
            Acumulado da Safra
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700">
            {selectedSafra}
          </span>
        </div>
        
        <div className="flex items-baseline gap-2 mt-1 mb-3">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
            {currentSafraMetrics.total_mm.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
          </span>
          <span className="text-sm font-bold text-rain-600 dark:text-rain-400">mm</span>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Dias com chuva: <strong className="text-slate-800 dark:text-white font-semibold">{currentSafraMetrics.rainy_days}</strong></span>
          {currentSafraMetrics.max_day.rain_mm > 0 && (
            <span title={`Maior dia: ${currentSafraMetrics.max_day.rain_mm} mm`}>
              Pico: <strong className="text-sky-600 dark:text-sky-300">{currentSafraMetrics.max_day.rain_mm} mm</strong>
            </span>
          )}
        </div>
      </div>

      {/* CARD 2: Média Diária do Mês (com seletor de mês e safra) */}
      <MonthlyAverageCard
        selectedSafra={selectedSafra}
        safraMetricsMap={safraMetricsMap}
        availableSafras={availableSafras}
        historicalMonthAvg={historicalMonthAvg}
      />

      {/* CARD 3: Recorde Histórico Diário */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 relative overflow-hidden group flex flex-col">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition"></div>
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 mb-2 min-h-[24px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Recorde Diário (Máx)
          </span>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full whitespace-nowrap border border-amber-200 dark:border-amber-800/40">
            Histórico
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-1 mb-3">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
            {kpis?.recordDay?.rain_mm ? kpis.recordDay.rain_mm.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '0'}
          </span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">mm em 24h</span>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Data: <strong className="text-slate-800 dark:text-white">{kpis?.recordDay?.date ? formatDateBR(kpis.recordDay.date) : 'N/D'}</strong></span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">Safra {kpis?.recordDay?.safra}</span>
        </div>
      </div>

      {/* CARD 4: Extremos de Safra (Mais Chuvosa vs Mais Seca) */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 relative overflow-hidden group flex flex-col">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition"></div>
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 mb-2 min-h-[24px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Extremos de Safra
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700">
            {kpis?.safrasSummary?.length || 0} Safras
          </span>
        </div>

        <div className="space-y-1.5 mt-1 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Mais Chuvosa:
            </span>
            <span className="text-slate-900 dark:text-white font-bold">
              {kpis?.wettestSafra?.safra} ({kpis?.wettestSafra?.total_mm?.toLocaleString('pt-BR')} mm)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <TrendingDown className="w-3.5 h-3.5" /> Mais Seca:
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {kpis?.driestSafra?.safra} ({kpis?.driestSafra?.total_mm?.toLocaleString('pt-BR')} mm)
            </span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Total Histórico:</span>
          <strong className="text-rain-600 dark:text-rain-300">{kpis?.totalHistoricalRain?.toLocaleString('pt-BR')} mm ({kpis?.totalHistoricalRainyDays} dias)</strong>
        </div>
      </div>

    </div>
  );
}
