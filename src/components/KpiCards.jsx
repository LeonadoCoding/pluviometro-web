import React from 'react';
import { Droplets, Calendar, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDateBR, MONTHS_SAFRA } from '../utils/dates';

export default function KpiCards({ currentSafraMetrics, kpis, selectedSafra }) {
  if (!currentSafraMetrics) return null;

  const monthsMap = currentSafraMetrics.months || {};
  const monthsList = Object.values(monthsMap);
  
  // Determinação automática do Mês Atual (Sem seleção manual)
  // 1. Tenta identificar o mês atual do calendário real
  const currentCalMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentMonthDef = MONTHS_SAFRA.find(m => m.key === currentCalMonthNum);
  
  // 2. Se a safra visualizada possuir esse mês com dados ou estiver em curso, usa ele;
  // senão, pega o último mês com medição de chuva na safra selecionada (ou o primeiro do ciclo)
  let activeMonth = null;
  if (currentMonthDef && monthsMap[currentMonthDef.code] && (monthsMap[currentMonthDef.code].total_mm > 0 || selectedSafra.includes(String(new Date().getFullYear())))) {
    activeMonth = monthsMap[currentMonthDef.code];
  } else {
    // Último mês com chuva na safra
    const monthsWithRain = monthsList.filter(m => m.total_mm > 0);
    activeMonth = monthsWithRain.length > 0 ? monthsWithRain[monthsWithRain.length - 1] : monthsList[0];
  }

  const monthTotal = activeMonth ? activeMonth.total_mm : 0;
  const daysInMonth = activeMonth ? activeMonth.daysInMonth : 30;
  const monthDailyAvg = activeMonth ? activeMonth.average_mm_day : 0;
  const monthName = activeMonth ? activeMonth.name : 'Mês Atual';
  const monthCode = activeMonth ? activeMonth.code : 'OUT';

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

      {/* CARD 2: Média Diária do Mês (Automático - Sem seleção manual) */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 relative overflow-hidden group flex flex-col">
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition"></div>
        
        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 mb-2 min-h-[24px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            Média Diária do Mês
          </span>
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full whitespace-nowrap border border-sky-200 dark:border-sky-800/50">
            {monthName}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-1 mb-3">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
            {monthDailyAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-sm font-bold text-sky-600 dark:text-sky-400">mm / dia</span>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate" title={`Cálculo exato: ${monthTotal} mm ÷ ${daysInMonth} dias exatos de ${monthName}`}>
            Cálculo: <strong className="text-slate-700 dark:text-slate-200">{monthTotal} mm</strong> ÷ <strong className="text-slate-700 dark:text-slate-200">{daysInMonth} dias</strong>
          </span>
        </div>
      </div>

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
