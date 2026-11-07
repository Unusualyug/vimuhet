import { forwardRef, useId, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Minus, Plus } from 'lucide-react';

/** `Full Name` -> `full-name`; used for the `name` attribute when none is given. */
const fieldName = (label = '') =>
  String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const fieldBase =
  'w-full rounded-xl border bg-[var(--surface-raised)] px-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 focus:border-[var(--accent)] disabled:opacity-60';

export const Label = ({ children, required, htmlFor, hint }) => (
  <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-muted)]">
    <span>
      {children}
      {required && <span className="ml-1 text-[var(--accent)]">*</span>}
    </span>
    {hint}
  </label>
);

export const FieldError = ({ children, id }) =>
  children ? (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
      <AlertCircle size={12} /> {children}
    </p>
  ) : null;

export const Input = forwardRef(function Input(
  { label, error, hint, required, className = '', icon: Icon, suffix, containerClass = '', ...props },
  ref
) {
  const id = useId();
  return (
    <div className={containerClass}>
      {label && <Label htmlFor={props.id || id} required={required} hint={hint}>{label}</Label>}
      <div className="relative">
        {Icon && <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />}
        <input
          ref={ref}
          id={props.id || id}
          name={props.name || fieldName(label)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${props.id || id}-error` : undefined}
          className={`${fieldBase} h-11 ${Icon ? 'pl-10' : ''} ${suffix ? 'pr-24' : ''} ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-[var(--line-color)]'
          } ${className}`}
          {...props}
        />
        {suffix && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      <FieldError id={`${props.id || id}-error`}>{error}</FieldError>
    </div>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      label={label}
      error={error}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="flex h-8 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] transition hover:text-[var(--accent)]"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, required, rows = 4, className = '', ...props }, ref) {
  const id = useId();
  return (
    <div>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <textarea
        ref={ref}
        id={id}
        name={props.name || fieldName(label)}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} py-3 ${error ? 'border-red-400' : 'border-[var(--line-color)]'} ${className}`}
        {...props}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
});

export const Select = forwardRef(function Select({ label, error, options = [], required, className = '', placeholder, ...props }, ref) {
  const id = useId();
  return (
    <div>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      <select
        ref={ref}
        id={id}
        name={props.name || fieldName(label)}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} h-11 appearance-none border-[var(--line-color)] bg-[length:16px] bg-[right_0.85rem_center] bg-no-repeat pr-10 ${
          error ? 'border-red-400' : ''
        } ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23756a66' stroke-width='2'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")",
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
});

export const Checkbox = ({ label, checked, onChange, error, description, ...props }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="group relative flex cursor-pointer items-start gap-2.5 text-sm text-[var(--ink)]">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-[var(--accent)] ${
            checked ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line-color)] bg-[var(--surface-raised)]'
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <input
          id={id}
          type="checkbox"
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <span>
          {label}
          {description && <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{description}</span>}
        </span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
};

export const Radio = ({ label, checked, onChange, name, value, description }) => {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm">
      <span
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition ${
          checked ? 'border-[var(--accent)]' : 'border-[var(--line-color)]'
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
      </span>
      <input id={id} type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span>
        {label}
        {description && <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{description}</span>}
      </span>
    </label>
  );
};

export const Toggle = ({ checked, onChange, label, description, disabled, className = '' }) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    {(label || description) && (
      <div className="min-w-0">
        {label && <p className="text-[12.5px] font-medium text-[var(--ink)]">{label}</p>}
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-muted)]">{description}</p>}
      </div>
    )}
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={typeof label === 'string' ? label : description || 'Toggle'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--line-color)]'
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-300 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </div>
);

export const QuantitySelector = ({ value, onChange, min = 1, max = 10, size = 'md', disabled }) => {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex items-center rounded-full border border-[var(--line-color)] bg-[var(--surface-raised)]">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className={`${dims} flex items-center justify-center rounded-l-full text-[var(--ink)] transition hover:text-[var(--accent)] disabled:opacity-35`}
      >
        <Minus size={13} />
      </button>
      <span className={`min-w-8 text-center text-sm font-medium tabular-nums ${size === 'sm' ? 'text-xs' : ''}`}>{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className={`${dims} flex items-center justify-center rounded-r-full text-[var(--ink)] transition hover:text-[var(--accent)] disabled:opacity-35`}
      >
        <Plus size={13} />
      </button>
    </div>
  );
};

export default Input;
