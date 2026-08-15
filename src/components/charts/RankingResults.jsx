/**
 * Ranking results, ordered best-first by average position.
 *
 * A ranking cannot be read as a tally. Every respondent ranks every option, so
 * the raw counts are identical across options and a bar chart of them says
 * nothing — the information is entirely in the positions.
 *
 * Average position is the honest summary: the mean of the places an option was
 * given, so 1.0 means everyone put it first. It is stated in words next to the
 * number because "1.8" alone is not self-explanatory, and it reads the same
 * whether three people answered or three hundred.
 *
 * The bar is comparative only, scaled so first place fills it and last place
 * empties it. The number is the fact; the bar is for scanning.
 */
export function RankingResults({ options }) {
  const ranked = options
    .map((o) => ({
      ...o,
      // rankSum is the running total of positions; count is how many
      // respondents placed it. Both come straight off the tally row.
      average: o.count > 0 ? o.rankSum / o.count : null,
    }))
    .filter((o) => o.average !== null)
    .sort((a, b) => a.average - b.average);

  if (ranked.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        No rankings yet.
      </p>
    );
  }

  const worst = options.length;

  return (
    <ol className="space-y-3">
      {ranked.map((option, index) => {
        // 1 (best) fills the bar, `worst` empties it.
        const fill =
          worst > 1 ? ((worst - option.average) / (worst - 1)) * 100 : 100;

        return (
          <li key={option.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-baseline gap-2">
                <span
                  className="shrink-0 font-semibold"
                  data-numeric
                  style={{ color: 'var(--muted)' }}
                >
                  {index + 1}.
                </span>
                <span className="truncate">{option.label}</span>
              </span>
              <span className="shrink-0" style={{ color: 'var(--ink-2)' }}>
                <span data-numeric className="font-medium" style={{ color: 'var(--ink)' }}>
                  {option.average.toFixed(1)}
                </span>{' '}
                avg. position
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full"
              style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(fill, 2)}%`, background: 'var(--s1)' }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
