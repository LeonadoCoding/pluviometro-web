import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, PencilLine, Plus } from 'lucide-react';
import Modal from './ui/Modal';
import { MONTHS_SAFRA, getTodayDateStr, getSafraFromDate } from '../utils/dates';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAYS_FULL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const fmt1 = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pad = (n) => String(n).padStart(2, '0');
const monthInfo = (m) => MONTHS_SAFRA.find(x => Number(x.key) === m);

// Escala de chuva do dia, da mais fraca à mais forte (mesmos limites do diário).
// Cada faixa tem texto próprio: a cor reforça, nunca é a única pista.
export const RAIN_SCALE = [
  { max: 10, label: 'Fraca', range: 'até 10', cls: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 dark:ring-1 dark:ring-inset dark:ring-orange-800' },
  { max: 25, label: 'Moderada', range: '10 a 25', cls: 'bg-orange-300 text-orange-950 dark:bg-orange-700 dark:text-white' },
  { max: 50, label: 'Forte', range: '25 a 50', cls: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950' },
  { max: Infinity, label: 'Muito forte', range: '50 ou mais', cls: 'bg-orange-800 text-white dark:bg-orange-200 dark:text-orange-950' }
];
export const rainStep = (mm) => (mm > 0 ? RAIN_SCALE.find(s => mm < s.max) : null);

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <span className="eyebrow block truncate">{label}</span>
      <b className="num block font-display text-[20px] leading-6 font-bold text-ink-strong mt-0.5 truncate">{value}</b>
      {sub && <span className="num block text-[12px] leading-4 text-ink-muted truncate">{sub}</span>}
    </div>
  );
}

export default function RainCalendar({ open, onClose, records = [], historicalMonthAvg = {}, canEdit, onEditRecord, onLaunchForDate }) {
  const today = getTodayDateStr();
  const [cursor, setCursor] = useState(() => ({ y: +today.slice(0, 4), m: +today.slice(5, 7) }));
  const [dir, setDir] = useState('next');
  const [selected, setSelected] = useState(null);

  // Sempre abre no mês vigente, com o dia de hoje escolhido
  useEffect(() => {
    if (!open) return;
    setCursor({ y: +today.slice(0, 4), m: +today.slice(5, 7) });
    setDir('next');
    setSelected(today);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDate = useMemo(() => new Map(records.map(r => [r.date, r])), [records]);
  const first = useMemo(() => records.reduce((a, r) => (r.date < a ? r.date : a), today), [records, today]);
  const minKey = first.slice(0, 7);
  const maxKey = today.slice(0, 7);
  const key = `${cursor.y}-${pad(cursor.m)}`;
  const canPrev = key > minKey;
  const canNext = key < maxKey;

  const go = (delta) => {
    setDir(delta > 0 ? 'next' : 'prev');
    setCursor(({ y, m }) => {
      const d = new Date(y, m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
    setSelected(null);
  };
  const goToday = () => {
    setDir(key > maxKey ? 'prev' : 'next');
    setCursor({ y: +today.slice(0, 4), m: +today.slice(5, 7) });
    setSelected(today);
  };

  const days = useMemo(() => {
    const total = new Date(cursor.y, cursor.m, 0).getDate();
    const lead = new Date(cursor.y, cursor.m - 1, 1).getDay();
    const cells = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) {
      const date = `${key}-${pad(d)}`;
      cells.push({ d, date, record: byDate.get(date) || null, future: date > today });
    }
    return cells;
  }, [cursor, key, byDate, today]);

  const info = monthInfo(cursor.m);
  const monthRecords = days.filter(c => c?.record);
  const total = monthRecords.reduce((a, c) => a + c.record.rain_mm, 0);
  const rainy = monthRecords.filter(c => c.record.rain_mm > 0).length;
  const peak = monthRecords.reduce((a, c) => (!a || c.record.rain_mm > a.record.rain_mm ? c : a), null);
  const hist = historicalMonthAvg?.[info?.code];
  const isCurrentMonth = key === maxKey;
  const diff = hist > 0 && !isCurrentMonth ? Math.round(((total - hist) / hist) * 100) : null;

  const sel = selected && selected.startsWith(key) ? { date: selected, record: byDate.get(selected) || null } : null;
  const selDate = sel ? new Date(`${sel.date}T12:00:00`) : null;
  const selStep = sel?.record ? rainStep(sel.record.rain_mm) : null;

  return (
    <Modal open={open} onClose={onClose} icon={CalendarDays} title="Calendário de chuvas" subtitle="Leituras dia a dia · valores em mm" size="md">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} disabled={!canPrev} className="btn btn-icon" aria-label="Mês anterior"><ChevronLeft /></button>
        <div className="text-center min-w-0" aria-live="polite">
          <h3 key={key} className="font-display text-[22px] leading-7 font-bold text-ink-strong uppercase tracking-wide [animation:fade-in_.3s_ease_both]">
            {info?.name} <span className="num text-accent-text">{cursor.y}</span>
          </h3>
          <p className="num text-[12px] leading-4 text-ink-muted">
            Safra {getSafraFromDate(`${key}-01`)}
            {!isCurrentMonth && (
              <> · <button type="button" onClick={goToday} className="font-semibold text-accent-text hover:underline underline-offset-2 [animation:fade-in_.25s_ease_both]">voltar a hoje</button></>
            )}
          </p>
        </div>
        <button type="button" onClick={() => go(1)} disabled={!canNext} className="btn btn-icon" aria-label="Próximo mês"><ChevronRight /></button>
      </div>

      <div key={`s-${key}`} className="grid grid-cols-3 gap-3 mt-4 rounded-lg border border-line bg-surface-sunken px-4 py-3 [animation:fade-in_.35s_ease_both]">
        <Stat
          label={isCurrentMonth ? 'Até hoje' : 'Total do mês'}
          value={<>{fmt1(total)} <span className="text-[13px] text-accent-text">mm</span></>}
          sub={hist != null ? (diff != null
            ? <>{diff > 0 ? '+' : ''}{diff}% vs. média<span className="hidden sm:inline"> ({fmt1(hist)})</span></>
            : <>média<span className="hidden sm:inline"> do mês</span>: {fmt1(hist)}</>) : null}
        />
        <Stat label="Com chuva" value={`${rainy} ${rainy === 1 ? 'dia' : 'dias'}`} sub={`de ${days.filter(Boolean).length}`} />
        <Stat label="Maior chuva" value={peak && peak.record.rain_mm > 0 ? <>{fmt1(peak.record.rain_mm)} <span className="text-[13px] text-accent-text">mm</span></> : '—'} sub={peak && peak.record.rain_mm > 0 ? `dia ${peak.d}` : null} />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5" aria-hidden="true">
        {WEEKDAYS.map((w, i) => <span key={i} className="text-center text-[11px] leading-4 font-bold text-ink-muted">{w}</span>)}
      </div>

      <div key={key} role="grid" aria-label={`${info?.name} de ${cursor.y}`} className={`mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5 ${dir === 'next' ? '[animation:cal-next_.32s_cubic-bezier(.2,.8,.2,1)_both]' : '[animation:cal-prev_.32s_cubic-bezier(.2,.8,.2,1)_both]'}`}>
        {days.map((c, i) => {
          if (!c) return <span key={`e${i}`} />;
          const step = c.record ? rainStep(c.record.rain_mm) : null;
          const isToday = c.date === today;
          const isSel = c.date === selected;
          const label = `${c.d} de ${info?.name}: ${c.record ? `${fmt1(c.record.rain_mm)} mm${step ? `, chuva ${step.label.toLowerCase()}` : ', sem chuva'}` : c.future ? 'ainda não chegou' : 'sem leitura'}`;
          return (
            <button
              key={c.date}
              type="button"
              disabled={c.future}
              onClick={() => setSelected(c.date)}
              aria-label={label}
              aria-pressed={isSel}
              className={`relative h-[52px] sm:h-[56px] rounded-md border flex flex-col items-stretch justify-between p-1 sm:p-1.5 text-left transition-[border-color,background-color,transform,box-shadow] duration-150 [animation:fade-up_.3s_ease_both]
                ${c.future ? 'border-transparent opacity-40 cursor-default' : 'border-line bg-surface hover:border-[rgba(242,131,34,.6)] hover:-translate-y-px active:scale-[.97]'}
                ${isSel ? '!border-accent ring-2 ring-[rgba(242,131,34,.28)] shadow-card-hover' : ''}`}
              style={{ animationDelay: `${Math.min(i, 34) * 9}ms` }}
            >
              <span className={`num text-[12px] leading-4 font-semibold ${isToday ? 'self-start rounded px-1 -mx-0.5 bg-oilema-petrol text-white' : 'text-ink'}`}>{c.d}</span>
              {c.record && (step ? (
                <span className={`num rounded text-center text-[11px] sm:text-[12px] leading-4 sm:leading-[18px] font-bold ${step.cls}`}>{fmt1(c.record.rain_mm)}</span>
              ) : (
                <span className="num text-center text-[11px] leading-4 font-semibold text-ink-muted">0</span>
              ))}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] leading-4 text-ink-muted">
        {RAIN_SCALE.map(s => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={`w-4 h-3 rounded-sm ${s.cls}`} />{s.label} <span className="num">({s.range})</span>
          </span>
        ))}
      </div>

      <div className="mt-4 min-h-[76px]">
        {sel && (
          <div key={sel.date} className="rounded-lg border border-line bg-surface-sunken px-4 py-3 flex items-center justify-between gap-3 [animation:drop-in_.22s_ease_both]">
            <div className="min-w-0">
              <p className="text-[13px] leading-[18px] text-ink-muted">
                <span>{WEEKDAYS_FULL[selDate.getDay()].charAt(0).toUpperCase() + WEEKDAYS_FULL[selDate.getDay()].slice(1)}</span>,{' '}<span className="num">{selDate.getDate()} de {info?.name.toLowerCase()}</span>
                {sel.date === today && <span className="chip chip-petrol ml-2 h-5 text-[10px]">HOJE</span>}
              </p>
              {sel.record ? (
                <>
                  <p className="flex items-baseline gap-1.5 mt-0.5">
                    <b className="num font-display text-[24px] leading-7 font-bold text-ink-strong">{fmt1(sel.record.rain_mm)}</b>
                    <span className="text-[13px] font-bold text-accent-text">mm</span>
                    <span className="text-[13px] font-semibold text-ink-muted">· {selStep ? `chuva ${selStep.label.toLowerCase()}` : 'sem chuva'}</span>
                  </p>
                  {sel.record.notes && <p className="text-[12px] leading-4 text-ink truncate mt-0.5" title={sel.record.notes}>{sel.record.notes}</p>}
                </>
              ) : (
                <p className="text-[15px] font-semibold text-ink-strong mt-0.5">Nenhuma leitura neste dia</p>
              )}
            </div>
            {canEdit && (sel.record ? (
              <button type="button" onClick={() => onEditRecord?.(sel.record)} className="btn btn-secondary flex-shrink-0"><PencilLine /> Corrigir</button>
            ) : (
              <button type="button" onClick={() => onLaunchForDate?.(sel.date)} className="btn btn-primary flex-shrink-0"><Plus /> Lançar</button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
