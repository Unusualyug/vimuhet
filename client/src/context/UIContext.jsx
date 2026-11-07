import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const UIContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, variant = 'success', options = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, message, variant, title: options.title }]);
      setTimeout(() => dismiss(id), options.duration || 4200);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <UIContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant] || Info;
            const tone =
              t.variant === 'error'
                ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/80 dark:text-red-100'
                : t.variant === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-100'
                  : t.variant === 'info'
                    ? 'border-line bg-[var(--surface-raised)] text-[var(--ink)]'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/80 dark:text-emerald-100';
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_18px_40px_-24px_rgba(61,16,29,0.5)] ${tone}`}
                role="status"
                aria-live="polite"
              >
                <Icon size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 text-sm">
                  {t.title && <p className="font-semibold">{t.title}</p>}
                  <p className="leading-snug">{t.message}</p>
                </div>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 transition hover:opacity-100">
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </UIContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useToast must be used inside UIProvider');
  return ctx;
};
