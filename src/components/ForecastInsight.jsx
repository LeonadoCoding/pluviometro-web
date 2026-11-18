import React, { useEffect, useState } from 'react';
import { CloudRain, Sun, ArrowDown } from 'lucide-react';
import { fetchRainForecast } from '../services/forecast';
import { getTodayDateStr } from '../utils/dates';
import { REFERENCE_TOWN } from '../config/location';

const REFRESH_MS = 60 * 60 * 1000; // 1 hora

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

// Distância em km entre dois pontos (fórmula de haversine)
function distanceKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// "11,835° S, 46,293° O"
const fmtCoord = (value, pos, neg) =>
  `${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}° ${value < 0 ? neg : pos}`;

// Posição realmente usada pela previsão, com a cidade de referência
export function describeForecastPosition(location) {
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) return null;
  const km = Math.round(distanceKm(location, REFERENCE_TOWN));
  return `coordenadas da UBS (${fmtCoord(location.lat, 'N', 'S')}, ${fmtCoord(location.lon, 'L', 'O')}), a ${km} km de ${REFERENCE_TOWN.name}`;
}

// Resumo prático da previsão, a partir dos dias resumidos pela função rain-forecast
export function buildForecastInsight(days, today) {
  const upcoming = (days || []).filter(d => d.date >= today).slice(0, 5);
  if (!upcoming.length) return null;
  const next3 = upcoming.slice(0, 3);
  const total3 = next3.reduce((sum, d) => sum + d.rain_mm, 0);
  const total5 = upcoming.reduce((sum, d) => sum + d.rain_mm, 0);

  if (total5 < 1) {
    return { rainy: false, text: `Sem chuva prevista nos próximos ${upcoming.length} dias`, days: upcoming };
  }
  if (total3 < 1) {
    const next = upcoming.find(d => d.rain_mm >= 1) || upcoming.find(d => d.rain_mm > 0);
    return {
      rainy: false,
      text: 'Próximos 3 dias sem chuva relevante',
      detail: `próxima chuva prevista ${dayLabel(next.date, today)}: cerca de ${approx(next.rain_mm)} mm`,
      days: upcoming
    };
  }
  const peak = next3.reduce((a, b) => (b.rain_mm > a.rain_mm ? b : a));
  const headline = total3 >= 30 ? 'Dias chuvosos pela frente' : total3 >= 10 ? 'Chuva moderada prevista' : 'Chuva fraca prevista';
  return {
    rainy: true,
    text: `${headline}: cerca de ${approx(total3)} mm nos próximos 3 dias`,
    detail: `mais chuva ${dayLabel(peak.date, today)}: cerca de ${approx(peak.rain_mm)} mm (${peak.pop_max}% de chance)`,
    days: upcoming
  };
}

const SHORT_DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Cinco barrinhas de chuva prevista, uma por dia
function MiniForecast({ days, today }) {
  const max = Math.max(10, ...days.map(d => d.rain_mm));
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {days.map((d) => {
        const h = d.rain_mm > 0 ? Math.max(4, Math.round((d.rain_mm / max) * 30)) : 2;
        const label = d.date === today ? 'hoje' : SHORT_DAYS[new Date(`${d.date}T12:00:00`).getDay()];
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 w-7">
            <div className="h-[30px] w-full flex items-end justify-center">
              <span className={`w-2.5 rounded-full ${d.rain_mm > 0 ? 'bg-accent' : 'bg-line'}`} style={{ height: h }} />
            </div>
            <span className="text-[10px] leading-3 text-ink-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ForecastInsight({ mapAnchorId }) {
  const [insight, setInsight] = useState(null);
  const [position, setPosition] = useState(null);
  const [failed, setFailed] = useState(false);

  // Busca ao abrir e de hora em hora enquanto a página estiver aberta (a função guarda a previsão por 1 hora).
  // Abas em segundo plano têm os timers atrasados pelo navegador: ao voltar para a aba, atualiza se já passou 1 hora.
  useEffect(() => {
    let active = true;
    let lastLoad = 0;
    const load = () => {
      lastLoad = Date.now();
      fetchRainForecast()
        .then((data) => {
          if (!active) return;
          setInsight(buildForecastInsight(data.days, getTodayDateStr()));
          setPosition(describeForecastPosition(data.location));
          setFailed(false);
        })
        .catch((err) => { console.warn('Previsão indisponível:', err.message); if (active) setFailed(true); });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad >= REFRESH_MS) load();
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const goToMap = (e) => {
    e.preventDefault();
    document.getElementById(mapAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!insight) {
    if (failed) return null;
    return (
      <div className="flex items-center gap-3 max-w-[560px]" aria-hidden="true">
        <span className="skeleton w-10 h-10 rounded-lg" />
        <span className="flex-1 space-y-2"><span className="skeleton block h-3.5 w-4/5" /><span className="skeleton block h-3 w-3/5" /></span>
      </div>
    );
  }

  const Icon = insight.rainy ? CloudRain : Sun;
  const today = getTodayDateStr();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 [animation:fade-in_.4s_ease_both]">
      <div className="flex items-start gap-3 min-w-0">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.rainy ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' : 'bg-petrol-100 text-oilema-petrol dark:bg-petrol-800 dark:text-petrol-200'}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] sm:text-[15px] leading-[21px] text-ink">
            <strong className="font-bold text-ink-strong">{insight.text}</strong>
            {insight.detail && <span className="text-ink"> · {insight.detail}</span>}
          </p>
          <p className="text-[12px] leading-[17px] text-ink-muted mt-1">
            Previsão OpenWeather{position ? ` para as ${position}` : ''} ·{' '}
            <a href={`#${mapAnchorId}`} onClick={goToMap} className="group inline-flex items-center gap-0.5 font-semibold text-accent-text whitespace-nowrap">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] group-hover:bg-[length:100%_1px] transition-[background-size] duration-300">ver no mapa</span>
              <ArrowDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
            </a>
          </p>
        </div>
      </div>
      {insight.days?.length > 1 && (
        <div className="sm:pl-5 sm:border-l border-line flex-shrink-0" title="Chuva prevista por dia">
          <MiniForecast days={insight.days} today={today} />
        </div>
      )}
    </div>
  );
}
