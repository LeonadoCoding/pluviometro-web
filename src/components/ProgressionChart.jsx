import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

export default function ProgressionChart({ progression, selectedSafra, isDark = true }) {
  const [viewMode, setViewMode] = useState('combined'); // 'combined', 'monthly', 'cumulative'

  if (!progression || progression.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1.5">
            <span>{data.monthName} ({data.year})</span>
            <span className="text-rain-600 dark:text-rain-400 font-mono">{data.monthCode}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block"></span>
              Total do Mês:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{data.monthTotal.toLocaleString('pt-BR')} mm</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
              Média Diária:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.dailyAverage.toLocaleString('pt-BR')} mm/dia</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Dias no Mês:</span>
            <span className="text-slate-700 dark:text-slate-200">{data.daysInMonth} dias ({data.rainyDays} c/ chuva)</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-1.5 mt-1.5">
            <span className="flex items-center gap-1.5 text-rain-600 dark:text-rain-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
              Acumulado até o mês:
            </span>
            <span className="font-extrabold text-rain-700 dark:text-cyan-300">{data.cumulative.toLocaleString('pt-BR')} mm</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div id="chart-progression-card" className="glass-panel rounded-2xl p-4 sm:p-6 relative transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rain-600 dark:text-rain-400" />
            Progresso Pluviométrico na Safra {selectedSafra}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evolução mês a mês no ciclo agronômico (Outubro a Setembro)
          </p>
        </div>

        {/* Seletor de Modo de Visualização */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('combined')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'combined'
                ? 'bg-rain-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Combinado
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'monthly'
                ? 'bg-rain-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'cumulative'
                ? 'bg-rain-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Acumulado
          </button>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="w-full h-72 sm:h-80 -ml-2 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={progression} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="monthCode"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: axisColor }}
            />
            <YAxis
              yAxisId="left"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit=" mm"
            />
            {viewMode === 'combined' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#0284c7"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit=" mm"
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
              formatter={(value) => (
                <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">{value}</span>
              )}
            />

            {(viewMode === 'combined' || viewMode === 'monthly') && (
              <Bar
                yAxisId="left"
                dataKey="monthTotal"
                name="Chuva do Mês (mm)"
                fill="#0ea5e9"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            )}

            {(viewMode === 'combined' || viewMode === 'cumulative') && (
              <Line
                yAxisId={viewMode === 'combined' ? 'right' : 'left'}
                type="monotone"
                dataKey="cumulative"
                name="Acumulado da Safra (mm)"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0284c7', strokeWidth: 2, stroke: '#e0f2fe' }}
                activeDot={{ r: 6, fill: '#38bdf8' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
