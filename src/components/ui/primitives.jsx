import React, { useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

// Logo oficial: colorida no tema claro, toda laranja no escuro (nunca redesenhada)
export function Logo({ className = 'h-11' }) {
  return (
    <>
      <img src={`${BASE}logo-oilema-cores.png`} alt="Oilema — Sementes para o novo campo" className={`${className} w-auto dark:hidden`} width="360" height="154" />
      <img src={`${BASE}logo-oilema.png`} alt="Oilema — Sementes para o novo campo" className={`${className} w-auto hidden dark:block`} width="900" height="380" />
    </>
  );
}

export function Symbol({ className = 'h-9 w-9' }) {
  return <img src={`${BASE}logo-oilema-simbolo.png`} alt="Oilema" className={className} width="256" height="256" />;
}

// As duas ondas do papel timbrado, pintadas com wave-back e wave-front (seguem o tema)
const WAVE_BACK = 'M1227.9 1177.8C1197.1 1119.7 1170.5 1047.8 1156.6 985.2C1143.1 924.7 1138.3 876.4 1139.3 812.5C1140.2 758.8 1143.2 731.4 1155.0 671.5C1164.4 623.7 1167.1 585.6 1164.0 544.9C1153.2 405.0 1085.2 278.1 977.3 196.8C928.6 160.0 886.1 119.3 848.5 73.5C826.8 47.1 797.3 5.3 798.4 2.5C799.1 0.5 1235.8 0.2 1237.8 2.2C1239.6 4.0 1239.5 1194.0 1237.7 1194.0C1237.0 1194.0 1232.6 1186.7 1227.9 1177.8Z';
const WAVE_FRONT = 'M1227.9 1177.8C1197.1 1119.7 1170.5 1047.8 1156.6 985.2C1143.1 924.7 1138.3 876.4 1139.3 812.5C1140.2 758.8 1143.2 731.4 1155.0 671.5C1164.4 623.7 1167.1 585.6 1164.0 544.9C1153.2 405.0 1085.2 278.1 977.3 196.8C928.6 160.0 886.1 119.3 848.5 73.5C826.8 47.1 797.3 5.3 798.4 2.5C799.3 -0.0 1115.1 0.3 1117.2 2.8C1121.3 7.6 1149.0 58.9 1165.9 93.0C1203.0 167.9 1224.6 229.4 1236.5 294.3L1239.0 308.1L1239.0 393.0L1239.0 477.9L1235.4 496.7C1230.9 520.6 1227.7 534.0 1219.6 562.7C1194.5 651.9 1189.4 736.4 1203.1 832.5C1208.3 868.9 1224.3 935.2 1236.5 970.9L1239.0 978.4L1239.0 1086.2C1239.0 1172.4 1238.7 1194.0 1237.7 1194.0C1237.0 1194.0 1232.6 1186.7 1227.9 1177.8Z';

export function Waves({ className = '', full = false, paper = false }) {
  return (
    <svg
      className={`waves pointer-events-none ${className}`}
      viewBox={full ? '797 0 443 1195' : '797 0 443 620'}
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden="true"
    >
      <path className={paper ? undefined : 'wb'} fill={paper ? '#c4c9cd' : undefined} d={WAVE_BACK} />
      <path className={paper ? undefined : 'wf'} fill={paper ? '#fad9b9' : undefined} d={WAVE_FRONT} />
    </svg>
  );
}

// Abas segmentadas com o indicador laranja deslizando até a opção escolhida
export function Segmented({ options, value, onChange, label, className = '' }) {
  const wrapRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrapRef.current?.querySelector('[aria-pressed="true"]');
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div ref={wrapRef} role="group" aria-label={label} className={`seg ${className}`}>
      {thumb && <span className="seg-thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />}
      {options.map((o) => (
        <button key={o.value} type="button" className="seg-btn" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-[15px] leading-[22px] text-ink-strong">{label}</p>
        {description && <p className="t-body-small text-ink-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-petrol-300 dark:bg-petrol-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform duration-300 ease-out ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

export function Notice({ type = 'error', children }) {
  const Icon = type === 'ok' ? Check : AlertTriangle;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`notice ${type === 'ok' ? 'notice-ok' : 'notice-error'}`} style={{ animation: 'drop-in .25s ease both' }}>
      <Icon />
      <span>{children}</span>
    </div>
  );
}

// Cabeçalho padrão de painel: ícone laranja de 20px, título, subtítulo e ações à direita
export function PanelHeader({ icon: Icon, title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5 ${className}`}>
      <div className="min-w-0">
        <h2 className="t-section-title text-ink-strong flex items-center gap-2 text-[17px] sm:text-[19px]">
          {Icon && <Icon className="w-5 h-5 text-accent-text flex-shrink-0" strokeWidth={2} />}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="t-body-small text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
