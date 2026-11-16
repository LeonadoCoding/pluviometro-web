import React, { useEffect, useState } from 'react';
import { CloudRain, CloudSun, CloudDrizzle, CloudLightning, Cloud, Sun, Umbrella, AlertTriangle } from 'lucide-react';
import { fetchRainForecast } from '../services/forecast';
import { getTodayDateStr } from '../utils/dates';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Ícone a partir do código da OpenWeatherMap (ex.: "10d")
function WeatherIcon({ code, className }) {
  const group = String(code || '').slice(0, 2);
  const Icon = { '01': Sun, '02': CloudSun, '03': Cloud, '04': Cloud, '09': CloudDrizzle, '10': CloudRain, '11': CloudLightning }[group] || Cloud;
  return <Icon className={className} />;
}

const fmtMm = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function RainForecastCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchRainForecast()
      .then((d) => { if (active) setData(d); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const today = getTodayDateStr();
  const days = (data?.days || []).filter(d => d.date >= today).slice(0, 5);
  const maxRain = Math.max(10, ...days.map(d => d.rain_mm));
  const totalRain = days.reduce((sum, d) => sum + d.rain_mm, 0);
  const updatedAt = data?.fetched_at
    ? new Date(data.fetched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 relative transition-colors flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Umbrella className="w-5 h-5 text-rain-600 dark:text-rain-400" />
            Previsão de Chuva
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Próximos 5 dias para a UBS • estimativa de modelo, não substitui a leitura do pluviômetro
          </p>
        </div>
        {days.length > 0 && (
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 block">Total previsto</span>
            <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">{fmtMm(totalRain)}</span>
            <span className="text-xs font-bold text-rain-600 dark:text-rain-400 ml-1">mm</span>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">Carregando previsão...</p>
      )}

      {!isLoading && error && (
        <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && days.length > 0 && (
        <ul className="space-y-2">
          {days.map((d) => {
            const date = new Date(`${d.date}T12:00:00`);
            const isToday = d.date === today;
            return (
              <li key={d.date} className="grid grid-cols-[40px_22px_1fr_auto] sm:grid-cols-[64px_28px_1fr_auto] items-center gap-2 sm:gap-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                <div className="leading-tight">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{isToday ? 'Hoje' : WEEKDAYS[date.getDay()]}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
                </div>
                <WeatherIcon code={d.icon} className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600 dark:text-sky-400" />
                <div className="min-w-0">
                  <span className="text-xs text-slate-700 dark:text-slate-300 block truncate first-letter:uppercase">
                    {d.description}{isToday && d.periods < 8 ? ' (restante do dia)' : ''}
                  </span>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-rain-500" style={{ width: `${Math.min(100, (d.rain_mm / maxRain) * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right leading-tight">
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">{fmtMm(d.rain_mm)} mm</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{d.pop_max}%<span className="hidden sm:inline"> de chance • {d.temp_min}°/{d.temp_max}°</span></span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !error && (
        <p className="mt-auto pt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Dados: <a href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer" className="font-semibold text-rain-600 dark:text-rain-400 hover:underline">OpenWeather</a>
          {updatedAt && <> • atualizado em {updatedAt}</>}
          {data?.stale && <span className="text-amber-600 dark:text-amber-400"> • não foi possível atualizar agora, exibindo a última previsão</span>}
        </p>
      )}
    </div>
  );
}
