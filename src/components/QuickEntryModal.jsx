import React, { useState, useEffect } from 'react';
import { X, CloudRain, Calendar, Check, Plus, AlertCircle } from 'lucide-react';
import { getSafraFromDate, getTodayDateStr } from '../utils/dates';

export default function QuickEntryModal({
  isOpen,
  onClose,
  onSave,
  initialDate = null
}) {
  const [date, setDate] = useState(initialDate || getTodayDateStr());
  const [rainMm, setRainMm] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || getTodayDateStr());
      setRainMm('');
      setNotes('');
      setErrorMsg('');
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const currentSafraCalculated = getSafraFromDate(date);

  const handleQuickAdd = (amount) => {
    const current = parseFloat(rainMm.replace(',', '.')) || 0;
    const nextVal = Math.round((current + amount) * 10) / 10;
    setRainMm(String(nextVal));
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yStr = d.toISOString().split('T')[0];
    setDate(yStr);
  };

  const handleSetToday = () => {
    setDate(getTodayDateStr());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsed = typeof rainMm === 'string' ? parseFloat(rainMm.replace(',', '.')) : parseFloat(rainMm);
    if (isNaN(parsed) || parsed < 0) {
      setErrorMsg('Por favor, informe um valor válido em milímetros (ex: 15.5).');
      return;
    }

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
      setErrorMsg(err.message || 'Erro ao salvar registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity">
      
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rain-500/10 dark:bg-rain-500/20 text-rain-600 dark:text-rain-400 flex items-center justify-center">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Lançamento de Chuva</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Entrada ágil diária de pluviometria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Campo de Data com Atalhos Hoje/Ontem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rain-600 dark:text-rain-400" />
                Data da Leitura
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  Ontem
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rain-500 cursor-pointer"
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Safra Calculada: <strong className="text-rain-600 dark:text-rain-400 font-bold">{currentSafraCalculated}</strong></span>
              <span>Ciclo Out-Set</span>
            </div>
          </div>

          {/* Campo de Volume de Chuva em mm (Mobile-first, fonte grande e inputMode decimal) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Precipitação Registrada (milímetros)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0.0"
                value={rainMm}
                onChange={(e) => setRainMm(e.target.value)}
                autoFocus
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-rain-500/40 focus:border-rain-500 rounded-2xl px-4 py-3 text-3xl font-extrabold text-slate-900 dark:text-white font-mono placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-rain-500/20"
              />
              <div className="absolute right-4 text-base font-bold text-rain-600 dark:text-rain-400 pointer-events-none">
                mm
              </div>
            </div>

            {/* Chips de Incremento Rápido (+1, +5, +10, +25, +50 mm) */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> Atalhos:
              </span>
              {[1, 5, 10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-sky-700 dark:text-sky-300 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                >
                  +{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRainMm('0')}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition"
              >
                0 mm
              </button>
            </div>
          </div>

          {/* Observações Opcionais */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Chuva torrencial c/ granizo, medição das 07h..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rain-500"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-rain-500 to-oilema-flame hover:from-rain-600 hover:to-rain-600 active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-rain-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>Confirmar e Salvar</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
