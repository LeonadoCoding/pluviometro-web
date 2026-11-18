import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GitCompareArrows } from 'lucide-react';
import { PanelHeader, Segmented } from './ui/primitives';
import { chartPalette, axisTick, fmtMm, fmtAxis, TooltipBox, useNarrow, monthTick } from './charts/chartTheme';

const METRICS = [
  { value: 'cum', label: 'Acumulado' },
  { value: 'monthly', label: 'Mensal' }
];

// Safra selecionada sempre em laranja (chart-1); as demais seguem chart-2..5 da mais recente para a mais antiga
function colorFor(safra, currentSafra, ordered, pal) {
  if (safra === currentSafra) return pal.c1;
  const others = ordered.filter(s => s !== currentSafra).reverse();
  const list = [pal.c2, pal.c3, pal.c4, pal.c5];
  return list[others.indexOf(safra) % list.length] || pal.axis;
}

export default function HistoricalComparisonChart({ historicalProgression, availableSafras, currentSafra, isDark = true, animate = true }) {
  const [metricType, setMetricType] = useState('cum');
  const [hidden, setHidden] = useState({});
  const pal = chartPalette(isDark);
  const narrow = useNarrow();

  // A safra selecionada no topo nunca fica escondida
  useEffect(() => { setHidden(h => ({ ...h, [currentSafra]: false })); }, [currentSafra]);

  if (!historicalProgression || historicalProgression.length === 0) return null;

  const TooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const rows = [...payload].filter(e => e.value != null).sort((a, b) => b.value - a.value);
    return (
      <TooltipBox title={`Mês: ${label}`} aside={metricType === 'cum' ? 'acumulado até o mês' : 'chuva no mês'}>
        {rows.map((e) => {
          const safra = e.dataKey.replace(/_(cum|monthly)$/, '');
          const isCur = safra === currentSafra;
          return (
            <div key={e.dataKey} className={`flex items-center justify-between gap-4 ${isCur ? 'rounded-md -mx-1.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-500/10' : ''}`}>
              <span className="flex items-center gap-2 text-ink">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="num">{safra}</span>
                {isCur && <span className="text-[11px] font-bold text-accent-text">ATUAL</span>}
              </span>
              <span className="num font-semibold text-ink-strong">{fmtMm(e.value)}</span>
            </div>
          );
        })}
      </TooltipBox>
    );
  };

  return (
    <div id="chart-historical-card" className="panel panel-pad flex flex-col enter" style={{ '--i': 6 }}>
      <PanelHeader
        icon={GitCompareArrows}
        title="Safras comparadas"
        subtitle="Todas as safras na mesma linha do tempo, de outubro a setembro · valores em mm"
        className="sm:flex-row lg:flex-col 2xl:flex-row"
        actions={<div data-html2canvas-ignore="true"><Segmented label="Medida" options={METRICS} value={metricType} onChange={setMetricType} /></div>}
      />

      <div className="flex flex-wrap items-center gap-1.5 mb-3" role="group" aria-label="Safras exibidas">
        {availableSafras.map((s) => {
          const on = !hidden[s];
          const color = colorFor(s, currentSafra, availableSafras, pal);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              disabled={s === currentSafra}
              onClick={() => setHidden(h => ({ ...h, [s]: !h[s] }))}
              className={`chip h-7 px-2.5 transition-[opacity,border-color,background-color] duration-200 disabled:cursor-default ${on ? 'bg-surface border-line text-ink-strong hover:border-petrol-400' : 'opacity-50 line-through decoration-ink-muted'}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="num">{s}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full h-[290px] sm:h-[300px] -ml-1.5 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalProgression} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={pal.grid} vertical={false} />
            <XAxis dataKey="monthCode" tick={axisTick(pal.axis)} tickLine={false} axisLine={{ stroke: pal.grid }} interval={0} tickMargin={8} tickFormatter={monthTick(narrow)} />
            <YAxis tick={axisTick(pal.axis)} tickLine={false} axisLine={false} tickFormatter={fmtAxis} width={narrow ? 40 : 50} />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: pal.grid, strokeWidth: 1.5 }} />
            {availableSafras.map((s) => {
              if (hidden[s]) return null;
              const isCur = s === currentSafra;
              const color = colorFor(s, currentSafra, availableSafras, pal);
              return (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={`${s}_${metricType}`}
                  name={`Safra ${s}`}
                  stroke={color}
                  strokeWidth={isCur ? 3.5 : 2}
                  strokeOpacity={isCur ? 1 : 0.85}
                  dot={isCur ? { r: 3.5, fill: color, stroke: pal.surface, strokeWidth: 2 } : false}
                  activeDot={{ r: isCur ? 6 : 4.5, stroke: pal.surface, strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={animate}
                  animationDuration={900}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
