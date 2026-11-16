import React from 'react';
import { Map as MapIcon } from 'lucide-react';
import { UBS_LOCATION } from '../config/location';

// Mapa e previsão de chuva da Windy (widget de incorporação gratuito, sem chave).
// detail=true mostra, abaixo do mapa, a tabela de previsão do ponto da UBS.
function buildEmbedUrl({ lat, lon }) {
  const params = new URLSearchParams({
    type: 'map',
    location: 'coordinates',
    metricRain: 'mm',
    metricTemp: '°C',
    metricWind: 'km/h',
    zoom: '8',
    overlay: 'rain',
    product: 'ecmwf',
    level: 'surface',
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    detail: 'true',
    marker: 'true',
    message: 'true'
  });
  return `https://embed.windy.com/embed.html?${params.toString()}`;
}

export default function WindyMapCard() {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 relative transition-colors flex flex-col">
      <div className="mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-rain-600 dark:text-rain-400" />
          Mapa e Previsão de Chuva
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Chuva prevista na região de {UBS_LOCATION.label} e, abaixo do mapa, a previsão hora a hora para a UBS • modelo ECMWF, estimativa que não substitui a leitura do pluviômetro
        </p>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
        <iframe
          title="Mapa de chuva da Windy"
          src={buildEmbedUrl(UBS_LOCATION)}
          loading="lazy"
          className="block w-full h-[640px] sm:h-[620px] border-0"
          allowFullScreen
        />
      </div>
      <p className="pt-3 text-[11px] text-slate-500 dark:text-slate-400">
        Mapa: <a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-rain-600 dark:text-rain-400 hover:underline">Windy.com</a>
      </p>
    </div>
  );
}
