import { useId, useState } from 'react';
import { formatDay, formatCount } from '../../lib/format.js';

/**
 * Responses over time — one series, so no legend box (the title names it) and
 * a single hue. Area fill under a 2px line; a crosshair + tooltip on hover,
 * which is the default for a line chart rather than an extra.
 */
export function TrendChart({ points, height = 180 }) {
  const clipId = useId();
  const [hover, setHover] = useState(null);

  if (!points || points.length === 0) {
    return (
      <p className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
        No responses yet — the trend appears once people start responding.
      </p>
    );
  }

  const width = 640;
  const pad = { top: 12, right: 12, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(...points.map((p) => p.count), 1);
  // A single point has no span to divide by; pin it to the left edge.
  const x = (i) => pad.left + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.count)}`).join(' ');
  const area = `${line} L ${x(points.length - 1)} ${pad.top + plotH} L ${x(0)} ${pad.top + plotH} Z`;

  const ticks = [0, Math.round(max / 2), max];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: height }}
        role="img"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - box.left) / box.width) * width;
          const i = Math.round(((relX - pad.left) / plotW) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <title>Responses over time</title>

        {/* Recessive grid — hairlines, never competing with the data. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="text-[10px] tabular-nums"
              fill="var(--muted)"
            >
              {t}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id={clipId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${clipId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke="var(--axis)"
              strokeWidth="1"
            />
            <circle
              cx={x(hover)}
              cy={y(points[hover].count)}
              r="5"
              fill="var(--brand)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </g>
        )}

        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + plotH}
          y2={pad.top + plotH}
          stroke="var(--axis)"
          strokeWidth="1"
        />

        {/* First and last only — dense tick labels collide on mobile. */}
        <text x={pad.left} y={height - 6} className="text-[10px]" fill="var(--muted)">
          {formatDay(points[0].bucket)}
        </text>
        {points.length > 1 && (
          <text
            x={width - pad.right}
            y={height - 6}
            textAnchor="end"
            className="text-[10px]"
            fill="var(--muted)"
          >
            {formatDay(points.at(-1).bucket)}
          </text>
        )}
      </svg>

      <figcaption
        className="mt-1 h-5 text-center text-xs tabular-nums"
        style={{ color: 'var(--ink-2)' }}
      >
        {hover !== null
          ? `${formatDay(points[hover].bucket)} — ${formatCount(points[hover].count)} responses`
          : ''}
      </figcaption>
    </figure>
  );
}
