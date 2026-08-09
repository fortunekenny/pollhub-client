import { useId } from 'react';
import { pct, formatCount } from '../../lib/format.js';

/**
 * Donut for share-of-total.
 *
 * Here color IS the identity channel, so the validated categorical order
 * applies — assigned by fixed slot, never cycled. Past five options the tail
 * folds into "Other" rather than generating a sixth hue: the palette's
 * adjacent-pair guarantees stop holding beyond its validated slots.
 *
 * Light mode carries a sub-3:1 contrast warning on three of these hues, so
 * every segment is directly labeled and a table view sits alongside — that
 * relief is required, not optional.
 */
const SLOTS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
const MAX_SLICES = 5;

export function ShareDonut({ options, tallies, size = 190 }) {
  const gradientId = useId();

  const counts = options
    .map((o) => ({ ...o, count: tallies?.[o.id] ?? o.count ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const slices =
    counts.length > MAX_SLICES
      ? [
          ...counts.slice(0, MAX_SLICES - 1),
          {
            id: '__other',
            label: `Other (${counts.length - MAX_SLICES + 1})`,
            count: counts.slice(MAX_SLICES - 1).reduce((a, c) => a + c.count, 0),
          },
        ]
      : counts;

  const total = slices.reduce((a, s) => a + s.count, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
        No responses yet.
      </p>
    );
  }

  const radius = size / 2 - 6;
  const inner = radius * 0.62;
  const cx = size / 2;
  const cy = size / 2;

  let angle = -Math.PI / 2; // start at 12 o'clock
  const arcs = slices.map((slice, i) => {
    const fraction = slice.count / total;
    const start = angle;
    // 2px surface gap between adjacent fills, expressed as an angle.
    const gap = slices.length > 1 ? Math.min(0.03, fraction * 0.5) : 0;
    const end = angle + fraction * Math.PI * 2;
    angle = end;

    return {
      ...slice,
      color: SLOTS[i % SLOTS.length],
      fraction,
      path: arcPath(cx, cy, radius, inner, start + gap / 2, end - gap / 2),
    };
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg width={size} height={size} role="img" aria-labelledby={gradientId}>
        <title id={gradientId}>Share of responses by option</title>
        {arcs.map((arc) => (
          <path
            key={arc.id}
            d={arc.path}
            fill={arc.color}
            // 2px surface ring keeps neighbouring fills from touching.
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="text-2xl font-semibold"
          fill="var(--ink)"
        >
          {formatCount(total)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="text-xs" fill="var(--muted)">
          responses
        </text>
      </svg>

      {/* Legend is always present for 2+ series, and each entry is directly
          labeled with its value — identity is never carried by color alone. */}
      <ul className="min-w-40 space-y-2">
        {arcs.map((arc) => (
          <li key={arc.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: arc.color, outline: '1px solid var(--ring)' }}
            />
            <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--ink-2)' }}>
              {arc.label}
            </span>
            <span className="tabular-nums font-medium">{pct(arc.count, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function arcPath(cx, cy, outer, inner, start, end) {
  const large = end - start > Math.PI ? 1 : 0;
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

  const [x1, y1] = p(outer, start);
  const [x2, y2] = p(outer, end);
  const [x3, y3] = p(inner, end);
  const [x4, y4] = p(inner, start);

  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}
