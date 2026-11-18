import React, { useState, useEffect, useMemo } from 'react';
import { CloudRain, Check, AlertTriangle } from 'lucide-react';
import { getSafraFromDate, getTodayDateStr, formatDateBR } from '../utils/dates';
import Modal from './ui/Modal';
import { Notice, Spinner } from './ui/primitives';

const toInput = (n) => (n == null ? '' : String(n).replace('.', ','));
const parseMm = (s) => parseFloat(String(s).replace(',', '.'));
const fmt1 = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function shiftDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function QuickEntryModal({ isOpen, onClose, onSave, editingRecord = null, initialDate = null, records = [] }) {
  const [date, setDate] = useState(getTodayDateStr());
  const [rainMm, setRainMm] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Abre limpo para um lançamento novo, ou preenchido com a leitura que está sendo corrigida
  useEffect(() => {
    if (!isOpen) return;
    setDate(editingRecord?.date || initialDate || getTodayDateStr());
    setRainMm(editingRecord ? toInput(editingRecord.rain_mm) : '');
    setNotes(editingRecord?.notes || '');
    setErrorMsg('');
    setIsSubmitting(false);
  }, [isOpen, editingRecord, initialDate]);

  const existing = useMemo(() => (editingRecord ? null : records.find(r => r.date === date)), [records, date, editingRecord]);
  const today = getTodayDateStr();
  const yesterday = shiftDate(-1);
  const isFutureDate = date > today;

  const quickAdd = (amount) => {
    const current = parseMm(rainMm) || 0;
    setRainMm(toInput(Math.round((current + amount) * 10) / 10));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const parsed = parseMm(rainMm);
    if (!date) { setErrorMsg('Escolha a data da leitura.'); return; }
    if (isFutureDate) { setErrorMsg('A data da leitura não pode ser depois de hoje.'); return; }
    if (Number.isNaN(parsed) || parsed < 0) { setErrorMsg('Informe o volume em milímetros, por exemplo 15,5.'); return; }
    if (parsed > 400) { setErrorMsg('Volume acima de 400 mm em um dia. Confira a leitura.'); return; }

    setIsSubmitting(true);
    try {
      await onSave({
        date,
        rain_mm: Math.round(parsed * 10) / 10,
        notes: notes.trim() || null,
        property: 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS'
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Não foi possível gravar a leitura.');
      setIsSubmitting(false);
    }
  };

  const chip = (active) => `h-8 px-3 rounded-md text-[13px] font-semibold border transition-colors ${active ? 'bg-accent text-ink-strong border-transparent' : 'bg-surface-control text-ink border-line hover:border-petrol-400'}`;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      icon={CloudRain}
      title={editingRecord ? 'Corrigir leitura' : 'Lançar chuva'}
      subtitle={editingRecord ? `Leitura de ${formatDateBR(editingRecord.date)}` : 'Leitura do pluviômetro, em milímetros'}
      initialFocus="#rain-mm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-lg">Cancelar</button>
          <button type="submit" form="quick-entry" disabled={isSubmitting} className="btn btn-primary btn-lg sm:min-w-[180px]">
            {isSubmitting ? <><Spinner /> Gravando…</> : <><Check strokeWidth={2.5} /> {editingRecord ? 'Gravar correção' : 'Gravar leitura'}</>}
          </button>
        </>
      }
    >
      <form id="quick-entry" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {errorMsg && <Notice>{errorMsg}</Notice>}

        <div>
          <label htmlFor="rain-mm" className="field-label">Volume de chuva</label>
          <div className="relative">
            <input
              id="rain-mm"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,0"
              value={rainMm}
              onChange={(e) => setRainMm(e.target.value.replace(/[^\d.,]/g, ''))}
              className="input num h-[72px] rounded-xl text-[40px] font-display font-bold pl-5 pr-16 tracking-tight"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[18px] font-bold text-accent-text pointer-events-none">mm</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {[1, 5, 10, 20, 50].map((amt) => (
              <button key={amt} type="button" onClick={() => quickAdd(amt)} className="h-8 px-3 rounded-md text-[13px] font-bold border border-line bg-surface-control text-ink-strong hover:border-[rgba(242,131,34,.6)] hover:text-accent-text active:scale-95 transition num">
                +{amt}
              </button>
            ))}
            <button type="button" onClick={() => setRainMm('0')} className="h-8 px-3 rounded-md text-[13px] font-semibold text-ink-muted hover:text-ink-strong hover:bg-surface-control transition">
              Sem chuva (0)
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3 mb-1.5">
            <label htmlFor="rain-date" className="field-label mb-0">Data da leitura</label>
            {!editingRecord && (
              <div className="flex gap-1.5">
                <button type="button" className={chip(date === today)} onClick={() => setDate(today)}>Hoje</button>
                <button type="button" className={chip(date === yesterday)} onClick={() => setDate(yesterday)}>Ontem</button>
              </div>
            )}
          </div>
          <input id="rain-date" type="date" value={date} max={today} disabled={Boolean(editingRecord)} onChange={(e) => setDate(e.target.value)} required className="input num disabled:opacity-70" />
          <p className="hint num">Entra na safra <b className="text-accent-text">{date ? getSafraFromDate(date) : '—'}</b> · ciclo de outubro a setembro</p>
          {existing && (
            <div className="notice mt-3 bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-200" style={{ animation: 'drop-in .25s ease both' }}>
              <AlertTriangle />
              <span>Já existe uma leitura de <b className="num">{fmt1(existing.rain_mm)} mm</b> em {formatDateBR(existing.date)}. Gravar substitui o valor.</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="rain-notes" className="field-label">Observação <span className="font-normal text-ink-muted">(opcional)</span></label>
          <input id="rain-notes" type="text" maxLength={160} placeholder="Ex.: chuva com granizo, leitura às 7h" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
        </div>
      </form>
    </Modal>
  );
}
