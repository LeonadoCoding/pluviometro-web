import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import Modal from './Modal';

// ---------- Toasts: sem emoji, sem pulo; entram de cima no computador e de baixo no celular ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((text, type = 'ok') => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, text, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-[60] left-3 right-3 bottom-[calc(84px+env(safe-area-inset-bottom))] sm:left-auto sm:right-5 sm:bottom-auto sm:top-[84px] flex flex-col gap-2 sm:w-[380px] pointer-events-none"
      >
        {toasts.map((t) => {
          const Icon = t.type === 'error' ? AlertTriangle : t.type === 'info' ? Info : Check;
          const tone = t.type === 'error' ? 'text-danger' : t.type === 'info' ? 'text-accent-text' : 'text-success';
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface shadow-modal px-4 py-3 [animation:toast-in-up_.3s_cubic-bezier(.2,.8,.2,1)_both] sm:[animation:toast-in_.3s_cubic-bezier(.2,.8,.2,1)_both]"
            >
              <span className={`mt-0.5 ${tone}`}><Icon className="w-[18px] h-[18px]" strokeWidth={2.25} /></span>
              <p className="flex-1 text-[14px] leading-5 font-medium text-ink-strong">{t.text}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="text-ink-muted hover:text-ink-strong -mr-1 p-0.5 rounded" aria-label="Fechar aviso">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Confirmação no padrão da casa (substitui o window.confirm) ----------
const ConfirmCtx = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setState({ open: true, ...opts });
  }), []);

  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state?.open)}
        onClose={() => close(false)}
        title={state?.title || 'Confirmar'}
        icon={state?.icon}
        size="sm"
        initialFocus="[data-cancel]"
        footer={
          <>
            <button type="button" data-cancel="1" className="btn btn-secondary btn-lg" onClick={() => close(false)}>Cancelar</button>
            <button type="button" className={`btn btn-lg ${state?.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>
              {state?.confirmLabel || 'Confirmar'}
            </button>
          </>
        }
      >
        <p className="text-[15px] leading-6 text-ink">{state?.message}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
