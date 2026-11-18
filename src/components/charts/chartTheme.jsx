import React from 'react';

// Cores dos gráficos (tokens chart-* da UI Oilema Base). O Recharts precisa de valores
// literais nos atributos SVG, por isso o tema chega como isDark e não via var().
export function chartPalette(isDark) {
  return {
    c1: '#f28322',
    c2: isDark ? '#bcc9cd' : '#385059',
    c3: '#d97e4a',
    c4: '#6f9aa6',
    c5: '#7a9a5b',
    grid: isDark ? '#273b43' : '#dce3e5',
    axis: isDark ? '#8da0a7' : '#627880',
    surface: isDark ? '#1a2b31' : '#ffffff',
    soft: isDark ? 'rgba(242,131,34,.45)' : '#f8b072'
  };
}

// No celular os 12 meses não cabem com três letras: usa a inicial (O N D J F M A M J J A S)
export function useNarrow(max = 520) {
  const q = '(max-width: ' + max + 'px)';
  const [narrow, setNarrow] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return narrow;
}
export const monthTick = (narrow) => (v) => (narrow ? String(v).charAt(0) : v);

export const axisTick = (color) => ({ fill: color, fontSize: 12, fontFamily: 'Amsi Pro, Plus Jakarta Sans, system-ui, sans-serif' });

export const fmtMm = (n, d = 1) => (n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })} mm`);
export const fmtAxis = (n) => Number(n).toLocaleString('pt-BR');

export function TooltipBox({ title, aside, children }) {
  return (
    <div className="rounded-lg border border-line bg-surface shadow-modal px-3.5 py-3 min-w-[220px] text-[13px] leading-[18px]">
      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-line">
        <span className="font-bold text-ink-strong">{title}</span>
        {aside && <span className="text-[12px] text-ink-muted">{aside}</span>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function TooltipRow({ color, label, value, strong, dashed }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-ink">
        {color && (dashed
          ? <span className="w-3 h-0 border-t-2 border-dashed inline-block" style={{ borderColor: color }} />
          : <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />)}
        {label}
      </span>
      <span className={`num ${strong ? 'font-bold text-ink-strong' : 'font-semibold text-ink-strong'}`}>{value}</span>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[13px] leading-[18px] text-ink-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-2">
          {it.dashed
            ? <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: it.color }} />
            : <span className={`${it.line ? 'w-4 h-[3px] rounded-full' : 'w-2.5 h-2.5 rounded-full'}`} style={{ backgroundColor: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}
