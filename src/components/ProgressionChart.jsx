import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { PanelHeader, Segmented } from './ui/primitives';
import { chartPalette, axisTick, fmtMm, fmtAxis, TooltipBox, useNarrow, monthTick, TooltipRow, Legend } from './charts/chartTheme';

const MODES = [
  { value: 'combined', label: 'Combinado' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'cumulative', label: 'Acumulado' }
];

export default function ProgressionChart({ progression, selectedSafra, historicalMonthAvg = {}, isDark = true, animate = true }) {
  const [viewMode, setViewMode] = useState('combined');
  const pal = chartPalette(isDark);
  const narrow = useNarrow();

  const data = useMemo(() => {
    const currentIdx = (progression || []).findIndex((p, i, arr) => !p.isFuture && (arr[i + 1]?.isFuture ?? true) && p.cumulative != null);
    return (progression || []).map((p, i) => ({
      ...p,
      hist: historicalMonthAvg?.[p.monthCode] ?? null,
      inProgress: i === currentIdx && progression.some(x => x.isFuture)
    }));
  }, [progression, historicalMonthAvg]);

  if (!progression || progression.length === 0) return null;

  const showBars = viewMode !== 'cumulative';
  const showLine = viewMode !== 'monthly';
  const showHist = viewMode === 'monthly';

  const TooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <TooltipBox title={`${d.monthName} (${d.year})`} aside={d.inProgress ? 'em andamento' : d.isFuture ? 'ainda não começou' : null}>
        <TooltipRow color={pal.c1} label="Chuva no mês" value={d.isFuture ? '—' : fmtMm(d.monthTotal)} />
        <TooltipRow label="Média diária" value={d.isFuture ? '—' : `${d.dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm/dia`} />
        <TooltipRow label="Dias com chuva" value={d.isFuture ? '—' : `${d.rainyDays} de ${d.daysInMonth}`} />
        {d.hist != null && <TooltipRow color={pal.axis} dashed label="Média histórica" value={fmtMm(d.hist)} />}
        <div className="pt-1.5 mt-1.5 border-t border-line">
          <TooltipRow color={pal.c2} label="Acumulado da safra" value={fmtMm(d.cumulative)} strong />
        </div>
      </TooltipBox>
    );
  };

  const legend = [
    showBars && { color: pal.c1, label: viewMode === 'combined' ? 'Chuva do mês (eixo esquerdo)' : 'Chuva do mês' },
    showHist && { color: pal.axis, label: 'Média histórica do mês', dashed: true },
    showLine && { color: pal.c2, label: viewMode === 'combined' ? 'Acumulado da safra (eixo direito)' : 'Acumulado da safra', line: true }
  ].filter(Boolean);

  return (
    <div id="chart-progression-card" className="panel panel-pad flex flex-col enter" style={{ '--i': 5 }}>
      <PanelHeader
        icon={BarChart3}
        title="Chuva mês a mês"
        subtitle={`Safra ${selectedSafra}, de outubro a setembro · valores em mm`}
        className="sm:flex-row lg:flex-col 2xl:flex-row"
        actions={<div data-html2canvas-ignore="true"><Segmented label="Modo do gráfico" options={MODES} value={viewMode} onChange={setViewMode} /></div>}
      />

      <div className="w-full flex-1 min-h-[300px] sm:min-h-[320px] -ml-1.5">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: showLine && showBars ? 4 : 12, left: -6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={pal.grid} vertical={false} />
            <XAxis dataKey="monthCode" tick={axisTick(pal.axis)} tickLine={false} axisLine={{ stroke: pal.grid }} interval={0} tickMargin={8} tickFormatter={monthTick(narrow)} />
            <YAxis yAxisId="left" tick={axisTick(pal.axis)} tickLine={false} axisLine={false} tickFormatter={fmtAxis} width={narrow ? 36 : 46} />
            {viewMode === 'combined' && <YAxis yAxisId="right" orientation="right" tick={axisTick(pal.c2)} tickLine={false} axisLine={false} tickFormatter={fmtAxis} width={narrow ? 40 : 50} />}
            <Tooltip content={<TooltipContent />} cursor={{ fill: isDark ? 'rgba(255,255,255,.04)' : 'rgba(56,80,89,.06)' }} />

            {showBars && (
              <Bar yAxisId="left" dataKey="monthTotal" name="Chuva do mês" radius={[5, 5, 0, 0]} isAnimationActive={animate} animationDuration={700} maxBarSize={36}>
                {data.map((d) => <Cell key={d.monthCode} fill={d.inProgress ? pal.soft : pal.c1} />)}
              </Bar>
            )}
            {showHist && (
              <Line yAxisId="left" type="monotone" dataKey="hist" name="Média histórica" stroke={pal.axis} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={animate} />
            )}
            {showLine && (
              <Line
                yAxisId={viewMode === 'combined' ? 'right' : 'left'}
                type="monotone"
                dataKey="cumulative"
                name="Acumulado da safra"
                stroke={pal.c2}
                strokeWidth={3}
                isAnimationActive={animate}
                animationDuration={900}
                dot={{ r: 3.5, fill: pal.c2, strokeWidth: 2, stroke: pal.surface }}
                activeDot={{ r: 6, fill: pal.c1, stroke: pal.surface, strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={legend} />
    </div>
  );
}
