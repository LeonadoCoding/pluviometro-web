import React from 'react';
import { Droplet } from 'lucide-react';
import { Waves } from './ui/primitives';
import ForecastInsight from './ForecastInsight';
import { formatDateBR } from '../utils/dates';

const fmt1 = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Cartão de identificação (UI Oilema Base): unidade, ciclo, a safra exibida e a previsão, com o canto das ondas
export default function IdentityCard({ selectedSafra, lastRecord, mapAnchorId }) {
  return (
    <section id="topo" className="panel relative overflow-hidden enter scroll-mt-24" style={{ '--i': 0 }}>
      <Waves className="absolute top-0 right-0 h-full w-[120px] sm:w-[200px] lg:w-[230px] opacity-90" />
      <div className="relative p-5 sm:p-7 sm:pr-[200px] lg:pr-[230px]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip chip-petrol">UNIDADE DE BENEFICIAMENTO</span>
              <span className="text-[13px] text-ink-muted">Oeste da Bahia · Cerrado</span>
            </div>
            <h1 className="t-page-title text-ink-strong mt-2.5 text-[20px] sm:text-[24px] sm:leading-[30px]">
              Chuva na UBS Sementes Oilema, Placas
            </h1>
            <p className="t-body-small text-ink-muted mt-1">
              Leitura diária do pluviômetro em Barreiras/BA. A safra vai de <b className="font-semibold text-ink">outubro</b> a <b className="font-semibold text-ink">setembro</b>.
            </p>
          </div>

          <div className="grid grid-cols-2 md:flex gap-2 sm:gap-3 flex-shrink-0">
            {lastRecord && (
              <div className="rounded-lg border border-line bg-surface px-3.5 sm:px-4 py-2.5 min-w-0">
                <span className="eyebrow block">Última leitura</span>
                <span className="flex items-baseline gap-1.5 mt-0.5 whitespace-nowrap">
                  <Droplet className="w-4 h-4 text-accent-text self-center" />
                  <b className="num font-display text-[20px] sm:text-[22px] leading-7 font-bold text-ink-strong">{fmt1(lastRecord.rain_mm)}</b>
                  <span className="text-[13px] font-bold text-accent-text">mm</span>
                  <span className="num text-[13px] text-ink-muted ml-1">{formatDateBR(lastRecord.date).slice(0, 5)}</span>
                </span>
              </div>
            )}
            <div className="rounded-lg border border-line bg-surface px-3.5 sm:px-4 py-2.5 min-w-0">
              <span className="eyebrow block">Visualizando</span>
              <b className="num block font-display text-[20px] sm:text-[22px] leading-7 font-bold text-accent-text mt-0.5 whitespace-nowrap"><span className="hidden min-[400px]:inline">Safra </span>{selectedSafra}</b>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-line">
          <ForecastInsight mapAnchorId={mapAnchorId} />
        </div>
      </div>
    </section>
  );
}
