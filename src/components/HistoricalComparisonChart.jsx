import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { GitCompare } from 'lucide-react';

// Cores derivadas da paleta Oilema
const SAFRA_COLORS = {
  '2022/2023': '#D97E4A', // Argila
  '2023/2024': '#6F9AA6', // Petróleo claro
  '2024/2025': '#7A9A5B', // Verde campo
  '2025/2026': '#385059', // Petróleo
  '2026/2027': '#F28322'  // Laranja Oilema (Safra Atual)
};

// Petróleo escuro some no fundo escuro: usa um tom mais claro nesse tema
const getSafraColor = (safra, isDark) => {
  const color = SAFRA_COLORS[safra] || '#8DA0A7';
  return isDark && color === '#385059' ? '#A3B9C0' : color;
};

export default function HistoricalComparisonChart({
  historicalProgression,
  availableSafras,
  currentSafra,
  isDark = true
}) {
  const [metricType, setMetricType] = useState('cum'); // 'cum' ou 'monthly'
  const [activeSafras, setActiveSafras] = useState(
    availableSafras.reduce((acc, s) => ({ ...acc, [s]: true }), {})
  );

  if (!historicalProgression || historicalProgression.length === 0) return null;

  const toggleSafra = (safra) => {
    setActiveSafras(prev => ({ ...prev, [safra]: !prev[safra] }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[220px]">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1.5">
            <span>Mês: {label}</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">
              {metricType === 'cum' ? 'Acumulado até o mês' : 'Precipitação no mês'}
            </span>
          </div>

          <div className="space-y-1">
            {sortedPayload.map((entry) => {
              const safraName = entry.dataKey.replace('_cum', '').replace('_monthly', '');
              const isCurrent = safraName === currentSafra;
              return (
                <div key={entry.dataKey} className={`flex justify-between items-center ${isCurrent ? 'bg-rain-50 dark:bg-rain-500/10 px-1.5 py-0.5 rounded font-semibold' : ''}`}>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: entry.color }}
                    ></span>
                    Safra {safraName} {isCurrent && <span className="text-[10px] text-rain-600 dark:text-rain-400">(Atual)</span>}:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {Number(entry.value).toLocaleString('pt-BR')} mm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const gridColor = isDark ? '#273B43' : '#DCE3E5';
  const axisColor = isDark ? '#8DA0A7' : '#627880';

  return (
    <div id="chart-historical-card" className="glass-panel rounded-2xl p-4 sm:p-6 relative transition-colors flex flex-col">
      <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Comparativo Histórico Sobreposto
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sobreposição de todas as safras registradas na mesma linha do tempo (Outubro a Setembro)
          </p>
        </div>

        {/* Toggle Curva Acumulada vs Precipitação Mensal */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto lg:self-start shrink-0">
          <button
            onClick={() => setMetricType('cum')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
              metricType === 'cum'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Curva Acumulada
          </button>
          <button
            onClick={() => setMetricType('monthly')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
              metricType === 'monthly'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Volume Mensal
          </button>
        </div>
      </div>

      {/* Seletor rápido de Safras ativas */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">Exibir:</span>
        {availableSafras.map((s) => {
          const isActive = activeSafras[s] !== false;
          const color = getSafraColor(s, isDark);
          return (
            <button
              key={s}
              onClick={() => toggleSafra(s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                isActive
                  ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: color }}
              ></span>
              Safra {s}
              {s === currentSafra && <span className="text-[10px] text-rain-600 dark:text-rain-400 font-bold">*</span>}
            </button>
          );
        })}
      </div>

      {/* Gráfico Recharts */}
      <div className="w-full h-72 sm:h-80 -ml-2 sm:ml-0 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalProgression} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="monthCode"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: axisColor }}
            />
            <YAxis
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit=" mm"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
              formatter={(value) => {
                const s = value.replace('Safra ', '');
                return (
                  <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                    {value} {s === currentSafra ? '(Atual)' : ''}
                  </span>
                );
              }}
            />

            {availableSafras.map((s) => {
              if (activeSafras[s] === false) return null;
              const isCurrent = s === currentSafra;
              const color = getSafraColor(s, isDark);
              const key = `${s}_${metricType}`;

              return (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={key}
                  name={`Safra ${s}`}
                  stroke={color}
                  strokeWidth={isCurrent ? 3.5 : 2}
                  strokeDasharray={isCurrent ? undefined : (s === '2022/2023' ? '4 4' : undefined)}
                  dot={isCurrent ? { r: 4, fill: color, stroke: isDark ? '#1A2B31' : '#FCFCFC', strokeWidth: 2 } : { r: 2.5 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
