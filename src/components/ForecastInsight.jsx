import React, { useEffect, useState } from 'react';
import { CloudRain, Sun } from 'lucide-react';
import { fetchRainForecast } from '../services/forecast';
import { getTodayDateStr } from '../utils/dates';

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

// "cerca de" arredondado: sem falsa precisão (até 10 mm de 1 em 1, acima de 5 em 5)
const approx = (mm) => (mm < 10 ? Math.max(1, Math.round(mm)) : Math.round(mm / 5) * 5);

// "hoje", "amanhã" ou "na quarta-feira, 18/11" / "no sábado, 21/11"
function dayLabel(date, today) {
  if (date === today) return 'hoje';
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return 'amanhã';
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const prep = weekday === 0 || weekday === 6 ? 'no' : 'na';
  return `${prep} ${WEEKDAYS[weekday]}, ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

// Resumo prático da previsão, a partir dos dias resumidos pela função rain-forecast
export function buildForecastInsight(days, today) {
  const upcoming = (days || []).filter(d => d.date >= today).slice(0, 5);
  if (!upcoming.length) return null;
  const next3 = upcoming.slice(0, 3);
  const total3 = next3.reduce((sum, d) => sum + d.rain_mm, 0);
  const total5 = upcoming.reduce((sum, d) => sum + d.rain_mm, 0);

  if (total5 < 1) {
    return { rainy: false, text: `Sem chuva prevista nos próximos ${upcoming.length} dias` };
  }
  if (total3 < 1) {
    const next = upcoming.find(d => d.rain_mm >= 1) || upcoming.find(d => d.rain_mm > 0);
    return {
      rainy: false,
      text: 'Próximos 3 dias sem chuva relevante',
      detail: `próxima chuva prevista ${dayLabel(next.date, today)}: cerca de ${approx(next.rain_mm)} mm`
    };
  }
  const peak = next3.reduce((a, b) => (b.rain_mm > a.rain_mm ? b : a));
  const headline = total3 >= 30 ? 'Dias chuvosos pela frente' : total3 >= 10 ? 'Chuva moderada prevista' : 'Chuva fraca prevista';
  return {
    rainy: true,
    text: `${headline}: cerca de ${approx(total3)} mm nos próximos 3 dias`,
    detail: `mais chuva ${dayLabel(peak.date, today)}: cerca de ${approx(peak.rain_mm)} mm (${peak.pop_max}% de chance)`
  };
}

export default function ForecastInsight({ mapAnchorId }) {
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    let active = true;
    fetchRainForecast()
      .then((data) => { if (active) setInsight(buildForecastInsight(data.days, getTodayDateStr())); })
      .catch((err) => console.warn('Previsão indisponível:', err.message)); // sem previsão, o cabeçalho fica como antes
    return () => { active = false; };
  }, []);

  if (!insight) return null;
  const Icon = insight.rainy ? CloudRain : Sun;

  const goToMap = (e) => {
    e.preventDefault();
    document.getElementById(mapAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mt-2.5 flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${insight.rainy ? 'text-rain-600 dark:text-rain-400' : 'text-amber-500 dark:text-amber-400'}`} />
      <div>
        <p>
          <strong className="font-semibold text-slate-900 dark:text-white">{insight.text}</strong>
          {insight.detail && <> • {insight.detail}</>}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Previsão OpenWeather •{' '}
          <a href={`#${mapAnchorId}`} onClick={goToMap} className="font-semibold text-rain-600 dark:text-rain-400 hover:underline whitespace-nowrap">
            ver detalhes no mapa
          </a>
        </p>
      </div>
    </div>
  );
}
