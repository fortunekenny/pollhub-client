import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const VARIANTS = {
  primary: 'text-white hover:brightness-110',
  secondary: 'border hover:bg-[var(--plane)]',
  ghost: 'hover:bg-[var(--plane)]',
  danger: 'text-white hover:brightness-110',
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, style, loading, children, as, to, ...rest },
  ref,
) {
  const styles = {
    primary: { background: 'var(--brand)' },
    danger: { background: 'var(--critical)' },
    secondary: { borderColor: 'var(--ring)', color: 'var(--ink)' },
    ghost: { color: 'var(--ink-2)' },
  }[variant];

  const props = {
    ref,
    className: cx(BUTTON_BASE, VARIANTS[variant], SIZES[size], className),
    style: { ...styles, ...style },
    ...rest,
  };

  const content = (
    <>
      {loading && <Spinner size={16} />}
      {children}
    </>
  );

  if (to) return <Link to={to} {...props}>{content}</Link>;
  if (as === 'a') return <a {...props}>{content}</a>;
  return <button type="button" disabled={rest.disabled || loading} {...props}>{content}</button>;
});

export function Field({ label, hint, error, required, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium">
          {label}
          {required && <span style={{ color: 'var(--critical)' }} aria-hidden> *</span>}
        </label>
      )}
      {children}
      {/* Error replaces the hint rather than stacking, so the field never jumps. */}
      {error ? (
        <p className="text-xs" style={{ color: 'var(--critical)' }} role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>
      )}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border px-3 py-2.5 text-sm bg-[var(--surface)] ' +
  'placeholder:text-[var(--muted)] focus:outline-none focus:ring-2';

export const Input = forwardRef(function Input({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx(INPUT_CLASS, className)}
      style={{ borderColor: invalid ? 'var(--critical)' : 'var(--ring)', color: 'var(--ink)' }}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(INPUT_CLASS, 'min-h-24 resize-y', className)}
      style={{ borderColor: invalid ? 'var(--critical)' : 'var(--ring)', color: 'var(--ink)' }}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cx(INPUT_CLASS, 'appearance-none pr-8', className)}
      style={{ borderColor: 'var(--ring)', color: 'var(--ink)' }}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('card p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: { background: 'var(--plane)', color: 'var(--ink-2)' },
    brand: { background: 'color-mix(in srgb, var(--brand) 14%, transparent)', color: 'var(--brand-ink)' },
    good: { background: 'color-mix(in srgb, var(--good) 14%, transparent)', color: 'var(--good)' },
    critical: {
      background: 'color-mix(in srgb, var(--critical) 14%, transparent)',
      color: 'var(--critical)',
    },
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={tones[tone]}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 20, label }) {
  return (
    <span role="status" aria-label={label ?? 'Loading'} className="inline-flex">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm" style={{ color: 'var(--ink-2)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorNote({ error, className }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cx('rounded-lg px-3 py-2 text-sm', className)}
      style={{
        background: 'color-mix(in srgb, var(--critical) 10%, transparent)',
        color: 'var(--critical)',
      }}
    >
      {error.message ?? String(error)}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition"
        style={{ background: checked ? 'var(--brand)' : 'var(--axis)' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: checked ? '1.375rem' : '0.125rem' }}
        />
      </button>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
