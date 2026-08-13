import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/*
 * Sizes sit on the 8pt rhythm: 32px, 40px and 48px tall. The medium size is
 * the default because 40px clears the 24px minimum target with room to spare
 * while still letting a toolbar hold several controls in a row.
 */
const SIZES = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3',
};

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, loading, children, as, to, ...rest },
  ref,
) {
  const props = {
    ref,
    className: cx('btn', VARIANTS[variant], SIZES[size], className),
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

export const Input = forwardRef(function Input({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx('input', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx('input', 'min-h-24 resize-y', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

/*
 * The chevron is a background image rather than an overlaid element so it
 * cannot drift out of alignment, and it is encoded with currentColor swapped
 * for the ink token so it tracks the theme.
 */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' " +
  "viewBox='0 0 24 24' fill='none' stroke='%236f6d67' stroke-width='2' stroke-linecap='round' " +
  "stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cx('input', 'appearance-none pr-9', className)}
      style={{
        backgroundImage: CHEVRON,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.65rem center',
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Card({ className, interactive, elevation, children, ...rest }) {
  return (
    <div
      className={cx('card p-6', interactive && 'card-interactive', elevation && `elev-${elevation}`, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: { background: 'var(--plane)', color: 'var(--ink-2)' },
    brand: {
      background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
      color: 'var(--brand-ink)',
    },
    good: { background: 'color-mix(in srgb, var(--good) 14%, transparent)', color: 'var(--good)' },
    critical: {
      background: 'color-mix(in srgb, var(--critical) 14%, transparent)',
      color: 'var(--critical)',
    },
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={tones[tone]}
    >
      {children}
    </span>
  );
}

/** A filled dot for status rows — carries the tone next to a text label. */
export function Dot({ tone = 'neutral' }) {
  const colors = {
    neutral: 'var(--axis)',
    brand: 'var(--brand)',
    good: 'var(--good)',
    critical: 'var(--critical)',
  };
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: colors[tone] }}
    />
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

/**
 * Placeholder block for content that is still loading.
 *
 * Shaped like the content it stands in for, so the layout does not jump when
 * the real thing arrives — the pulse is suppressed under reduced-motion by the
 * global rule in index.css.
 */
export function Skeleton({ className, ...rest }) {
  return (
    <div
      aria-hidden
      className={cx('animate-pulse rounded-md', className)}
      style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)' }}
      {...rest}
    />
  );
}

/**
 * A single headline number.
 *
 * The value leads on size and the label sits under it in secondary ink: the
 * number is what the eye should land on first.
 */
export function Stat({ label, value, hint, tone }) {
  return (
    <div>
      <div
        className="text-2xl font-semibold"
        data-numeric
        style={tone ? { color: `var(--${tone})` } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-sm" style={{ color: 'var(--ink-2)' }}>
        {label}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon !== false && (
        <span
          aria-hidden
          className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
        >
          {icon ?? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M5 20V10M12 20V4M19 20v-6" />
            </svg>
          )}
        </span>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm" style={{ color: 'var(--ink-2)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error, className }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cx('flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm', className)}
      style={{
        background: 'color-mix(in srgb, var(--critical) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--critical) 30%, transparent)',
        color: 'var(--critical)',
      }}
    >
      {/* The icon means the message is not carried by colour alone. */}
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="mt-0.5 shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </svg>
      <span>{error.message ?? String(error)}</span>
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
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{
          background: checked ? 'var(--brand-fill)' : 'var(--axis)',
          transitionDuration: '160ms',
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{
            left: checked ? '1.375rem' : '0.125rem',
            boxShadow: '0 1px 2px rgba(26,26,24,0.35)',
            transitionDuration: '160ms',
          }}
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

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="mb-1 text-xs font-medium tracking-wide uppercase"
            style={{ color: 'var(--muted)' }}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm" style={{ color: 'var(--ink-2)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
