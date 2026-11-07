import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Accordion({ items = [], defaultOpen = [], allowMultiple = true, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = (id) =>
    setOpen((prev) => {
      const isOpen = prev.includes(id);
      if (isOpen) return prev.filter((x) => x !== id);
      return allowMultiple ? [...prev, id] : [id];
    });

  return (
    <div className={`divide-y divide-[var(--line-color)] border-y border-[var(--line-color)] ${className}`}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
              <span className={`text-sm font-medium transition-colors ${isOpen ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
                {item.title}
                {item.badge}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-[var(--ink-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 pr-6 text-sm leading-relaxed text-[var(--ink-muted)]">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function Tabs({ tabs = [], value, onChange, variant = 'underline', className = '' }) {
  if (variant === 'pill') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              value === tab.value
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]'
                : 'border-[var(--line-color)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex gap-6 overflow-x-auto border-b border-[var(--line-color)] no-scrollbar ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`relative shrink-0 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            value === tab.value ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 opacity-70">({tab.count})</span>}
          {value === tab.value && (
            <motion.span layoutId={`tab-underline-${tabs.map((t) => t.value).join('')}`} className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--accent)]" />
          )}
        </button>
      ))}
    </div>
  );
}

export default Accordion;
