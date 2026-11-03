import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/* ─────────── Toasts + confirm dialog (replace alert()/confirm()) ─────────── */

const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const toast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    []
  );

  const closeConfirm = (value) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      {createPortal(
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
          {toasts.map((t) => {
            const Icon = icons[t.type] || Info;
            const tone =
              t.type === 'error'
                ? 'bg-[#780000] text-[#fdf0d5]'
                : t.type === 'success'
                ? 'bg-[#003049] text-[#fdf0d5]'
                : 'bg-white text-[#003049] border border-[rgba(0,48,73,.2)]';
            return (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${tone}`}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="flex-1">{t.message}</span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
      {confirmState && (
        <Modal
          open
          onClose={() => closeConfirm(false)}
          title={confirmState.title || 'Are you sure?'}
          size="sm"
          footer={
            <>
              <button className="btn" onClick={() => closeConfirm(false)}>
                Cancel
              </button>
              <button
                className={`btn ${confirmState.danger ? 'btn-accent' : 'btn-primary'}`}
                onClick={() => closeConfirm(true)}
                autoFocus
              >
                {confirmState.confirmLabel || 'Confirm'}
              </button>
            </>
          }
        >
          <p className="muted">{confirmState.message}</p>
        </Modal>
      )}
    </UIContext.Provider>
  );
}

/* ─────────── Modal (Esc to close, click backdrop, scroll-safe) ─────────── */

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-[#003049]/55 p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${width} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <h3 className="text-xl">{title}</h3>
            {subtitle && <p className="muted text-sm mt-0.5">{subtitle}</p>}
          </div>
          <button className="btn btn-ghost btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[rgba(0,48,73,.12)] flex justify-end gap-2 bg-[#fffaf0] rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ─────────── Small helpers ─────────── */

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="text-center py-10 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#669bbc]/20 text-[#003049] flex items-center justify-center mx-auto mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="text-lg">{title}</h3>
      {text && <p className="muted text-sm mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* Local-date helpers (toISOString shifts dates in non-UTC zones) */
export const toDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmtTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
};
