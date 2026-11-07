import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition-[background-color,color,border-color,box-shadow,opacity,transform,filter] duration-300 disabled:cursor-not-allowed disabled:opacity-55 select-none whitespace-nowrap';

const variants = {
  primary:
    'bg-[var(--accent)] text-white hover:bg-[#5f0f24] active:bg-[#521021] shadow-[0_10px_24px_-14px_rgba(120,21,47,0.8)] dark:text-[#1a1113] dark:hover:opacity-90',
  secondary:
    'border border-[var(--accent)] text-[var(--accent)] bg-transparent hover:bg-[var(--accent-soft)]',
  outline: 'border border-[var(--line-color)] bg-[var(--surface-raised)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
  ghost: 'text-[var(--ink)] hover:bg-[var(--surface-sunken)]',
  subtle: 'bg-[var(--surface-sunken)] text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
  dark: 'bg-[var(--surface-inverse)] text-[var(--surface)] hover:opacity-90',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  link: 'text-[var(--accent)] underline-offset-4 hover:underline px-0',
};

const sizes = {
  xs: 'h-8 px-3 text-[11px] uppercase tracking-[0.14em] rounded-full',
  sm: 'h-9 px-4 text-xs uppercase tracking-[0.14em] rounded-full',
  md: 'h-11 px-6 text-[12px] uppercase tracking-[0.16em] rounded-full',
  lg: 'h-12 px-8 text-[12.5px] uppercase tracking-[0.18em] rounded-full',
  xl: 'h-14 px-10 text-sm uppercase tracking-[0.18em] rounded-full',
  icon: 'h-10 w-10 rounded-full',
  square: 'h-10 w-10 rounded-lg',
};

export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', loading = false, className = '', children, icon: Icon, iconRight: IconRight, disabled, ...props },
  ref
) {
  const classes = `${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} strokeWidth={1.8} /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={16} strokeWidth={1.8} /> : null}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} aria-disabled={disabled} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  if (as === 'motion') {
    return (
      <motion.button ref={ref} whileTap={{ scale: 0.98 }} className={classes} disabled={disabled || loading} {...props}>
        {content}
      </motion.button>
    );
  }
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ label, variant = 'ghost', size = 'icon', className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});

export default Button;
