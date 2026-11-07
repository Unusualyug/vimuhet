import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import useScrollLock from '../../hooks/useScrollLock.js';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer, hideClose = false }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#3d101d]/45 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 flex max-h-[92vh] w-full ${sizes[size]} flex-col overflow-hidden rounded-t-2xl border border-[var(--line-color)] bg-[var(--surface-raised)] shadow-[0_30px_80px_-40px_rgba(61,16,29,0.6)] sm:rounded-2xl`}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line-color)] px-5 py-4 sm:px-6">
                <div>
                  {title && <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>}
                  {subtitle && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{subtitle}</p>}
                </div>
                {!hideClose && (
                  <button onClick={onClose} aria-label="Close dialog" className="rounded-full p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]">
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="border-t border-[var(--line-color)] bg-[var(--surface-sunken)]/60 px-5 py-4 sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Drawer({ open, onClose, title, children, side = 'right', width = 'max-w-md', footer }) {
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#3d101d]/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} flex h-full w-full ${width} flex-col border-[var(--line-color)] bg-[var(--surface-raised)] shadow-[0_20px_60px_-20px_rgba(61,16,29,0.5)] ${
              side === 'right' ? 'border-l' : 'border-r'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--line-color)] px-5 py-4">
              <h3 className="font-display text-lg text-[var(--ink)]">{title}</h3>
              <button onClick={onClose} aria-label="Close panel" className="rounded-full p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-[var(--line-color)] px-5 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 rounded-full border border-[var(--line-color)] px-5 text-xs font-medium uppercase tracking-[0.14em] transition hover:border-[var(--accent)]">
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`h-10 rounded-full px-5 text-xs font-medium uppercase tracking-[0.14em] text-white transition disabled:opacity-60 ${
            tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[var(--accent)] hover:bg-[#5f0f24]'
          }`}
        >
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
