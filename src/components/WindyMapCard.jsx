import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, ExternalLink } from 'lucide-react';
import { UBS_LOCATION } from '../config/location';
import { PanelHeader } from './ui/primitives';

// Mapa e previsão de chuva da Windy (widget de incorporação gratuito, sem chave).
// detail=true mostra, abaixo do mapa, a tabela de previsão do ponto da UBS.
function buildEmbedUrl({ lat, lon }) {
  const params = new URLSearchParams({
    type: 'map', location: 'coordinates', metricRain: 'mm', metricTemp: '°C', metricWind: 'km/h',
    zoom: '8', overlay: 'rain', product: 'ecmwf', level: 'surface',
    lat: String(lat), lon: String(lon), detailLat: String(lat), detailLon: String(lon),
    detail: 'true', marker: 'true', message: 'true'
  });
  return `https://embed.windy.com/embed.html?${params.toString()}`;
}

export default function WindyMapCard() {
  const boxRef = useRef(null);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // O mapa só carrega quando chega perto da tela (economiza dados no celular)
  useEffect(() => {
    const el = boxRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const windyUrl = `https://www.windy.com/${UBS_LOCATION.lat}/${UBS_LOCATION.lon}?rain,${UBS_LOCATION.lat},${UBS_LOCATION.lon},9`;

  return (
    <div className="panel panel-pad flex flex-col enter" style={{ '--i': 7 }}>
      <PanelHeader
        icon={MapIcon}
        title="Mapa e previsão de chuva"
        subtitle={`Região de ${UBS_LOCATION.label} no mapa e, logo abaixo, a previsão hora a hora para a UBS. Modelo ECMWF: estimativa, não substitui a leitura do pluviômetro.`}
        actions={
          <a href={windyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <ExternalLink />
            Abrir na Windy
          </a>
        }
      />
      <div ref={boxRef} className="relative rounded-lg overflow-hidden border border-line bg-surface-sunken h-[620px] sm:h-[600px]">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-muted" aria-hidden="true">
            <div className="skeleton absolute inset-0 rounded-none" />
            <MapIcon className="relative w-8 h-8" />
            <span className="relative text-[13px] font-semibold">Carregando o mapa…</span>
          </div>
        )}
        {near && (
          <iframe
            title="Mapa de chuva da Windy para a UBS Placas"
            src={buildEmbedUrl(UBS_LOCATION)}
            onLoad={() => setLoaded(true)}
            className={`relative block w-full h-full border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
