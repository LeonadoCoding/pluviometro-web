import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const EXIT_MS = 240;

// Janela modal da UI Oilema Base: entra subindo, sai espelhada, fecha com Esc ou clique fora,
// prende o foco e devolve o foco a quem abriu. No celular vira uma folha que sobe do rodapé.
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  sheet = true,
  initialFocus,
  children,
  footer
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Foco inicial, Esc, Tab preso dentro da janela e rolagem da página travada
  useEffect(() => {
    if (!mounted || !open) return;
    const dialog = dialogRef.current;
    const focusables = () => [...dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    const t = setTimeout(() => {
      const target = initialFocus ? dialog.querySelector(initialFocus) : null;
      (target || focusables().find(el => !el.dataset.close) || dialog).focus({ preventScroll: true });
    }, 60);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
      if (e.key === 'Tab') {
        const els = focusables();
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (restoreRef.current?.focus) restoreRef.current.focus({ preventScroll: true });
    };
  }, [mounted, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const width = size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg';

  return createPortal(
    <div
      className={`modal-backdrop fixed inset-0 z-50 flex justify-center ${sheet ? 'items-end sm:items-center' : 'items-center'} p-0 sm:p-6 ${visible ? 'is-open' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-dialog ${sheet ? 'is-sheet rounded-t-2xl sm:rounded-2xl' : 'rounded-2xl m-4'} w-full ${width} max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-surface border border-line shadow-modal outline-none`}
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-line">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-50 text-orange-700 dark:bg-petrol-800 dark:text-orange-400">
                <Icon className="w-5 h-5" strokeWidth={2} />
              </span>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="t-modal-title text-ink-strong">{title}</h2>
              {subtitle && <p className="t-body-small text-ink-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button type="button" data-close="1" onClick={onClose} className="btn btn-icon-sm -mr-1.5 -mt-1" aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain flex-1">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
