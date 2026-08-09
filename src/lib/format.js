export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function formatCount(n) {
  return new Intl.NumberFormat().format(n ?? 0);
}

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDay(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );
}

/** "in 3 hours" / "2 days ago" — relative, so a closing time reads at a glance. */
export function relativeTime(value) {
  if (!value) return '';
  const diff = new Date(value).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const units = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(Math.round(diff / 1000), 'second');
}

/** Human summary of what a dedup mode actually protects against. */
export const DEDUP_LABELS = {
  none: 'No limit — anyone can respond repeatedly',
  cookie_device: 'One response per device',
  ip: 'One response per network address',
  account: 'One response per account',
  invite_code: 'One response per invite code',
};

export const IDENTITY_LABELS = {
  anonymous: 'Anonymous',
  name_required: 'Name required',
  account_required: 'Account required',
};

export const RESULTS_LABELS = {
  live: 'Live to everyone',
  after_vote: 'After responding',
  after_close: 'After the poll closes',
  creator_only: 'Only me',
};

export const VISIBILITY_LABELS = {
  public: 'Public — listed in Discover',
  unlisted: 'Unlisted — anyone with the link',
  private: 'Private — invited only',
};

export const QUESTION_TYPE_LABELS = {
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  rating: 'Rating scale',
  yes_no: 'Yes / No',
  short_text: 'Short text',
  long_text: 'Long text',
  ranking: 'Ranking',
};

export const CHOICE_TYPES = ['single_choice', 'multi_choice', 'yes_no', 'ranking'];
