import { useState } from 'react';
import { pct, formatCount } from '../../lib/format.js';
import { Button } from '../ui.jsx';

/**
 * Frame around a chart: title, a chart/table switch, and the table itself.
 *
 * The table view is not a nicety. Three light-mode categorical hues sit below
 * 3:1 against the surface, and the documented relief for that is visible
 * labels or a table view — this ships both. It also gives screen readers and
 * anyone printing a real path to the numbers.
 */
export function ChartPanel({ title, subtitle, rows, children, defaultView = 'chart' }) {
  const [view, setView] = useState(defaultView);
  const total = rows?.reduce((a, r) => a + r.count, 0) ?? 0;

  return (
    <section className="card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {rows && (
          <div
            className="flex rounded-lg p-0.5 text-xs"
            style={{ background: 'var(--plane)' }}
            role="group"
            aria-label="View as"
          >
            {['chart', 'table'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className="rounded-md px-2.5 py-1 capitalize transition"
                style={
                  view === v
                    ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }
                    : { color: 'var(--muted)' }
                }
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </header>

      {view === 'chart' ? (
        children
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)' }} className="text-left">
                <th className="py-1.5 pr-3 font-medium">Option</th>
                <th className="py-1.5 pr-3 text-right font-medium">Responses</th>
                <th className="py-1.5 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-1.5 pr-3">{r.label ?? 'Untitled option'}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(r.count)}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(r.count, total)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function StatTile({ label, value, hint, tone }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold"
        style={{ color: tone === 'good' ? 'var(--good)' : 'var(--ink)' }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export { Button };
