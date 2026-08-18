import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { pollsApi, analyticsApi, invitesApi } from '../lib/api.js';
import { useAsync, useAction, useDocumentTitle } from '../lib/hooks.js';
import { useLiveTallies } from '../lib/useLiveTallies.js';
import { formatCount, formatDate, relativeTime, DEDUP_LABELS, CHOICE_TYPES } from '../lib/format.js';
import {
  Button,
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  Spinner,
  Skeleton,
  Field,
  Input,
} from '../components/ui.jsx';
import { SharePanel } from '../components/SharePanel.jsx';
import { PollTimer } from '../components/PollTimer.jsx';
import { ResultBars } from '../components/charts/ResultBars.jsx';
import { ShareDonut } from '../components/charts/ShareDonut.jsx';
import { RankingResults } from '../components/charts/RankingResults.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { ChartPanel, StatTile } from '../components/charts/ChartPanel.jsx';

const BASE_TABS = ['results', 'share', 'analytics'];

export function PollDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  // null until the creator picks one, so the default can depend on the poll —
  // which has not loaded yet on first render.
  const [tab, setTab] = useState(null);

  const { data, loading, error, reload } = useAsync(() => pollsApi.get(id), [id]);
  const poll = data?.poll;
  const questions = data?.questions ?? [];

  // Invite codes only mean anything when they are what admits a respondent.
  // For every other dedup mode the tab offers a control with no effect.
  const usesInvites = poll?.dedupMode === 'invite_code';
  // Only a repeating poll has rounds to compare.
  const repeats = Boolean(poll?.repeatInterval);
  const tabs = [
    ...BASE_TABS,
    ...(repeats ? ['series'] : []),
    ...(usesInvites ? ['invites'] : []),
  ];

  // Open on invites straight after setup: an invite-only poll cannot take a
  // single response until codes exist, so issuing them is the next thing to
  // do — not something to go hunting for behind a tab.
  const defaultTab = usesInvites && poll?.responseCount === 0 ? 'invites' : 'results';

  // Falling back when `tab` is not in `tabs` covers both the unpicked initial
  // state and a stale 'invites' left selected if dedup mode ever changes.
  const activeTab = tabs.includes(tab) ? tab : defaultTab;

  useDocumentTitle(poll?.title);

  // Live only matters while the poll is open; a closed poll's numbers are final.
  const { tallies, responseCount, connection } = useLiveTallies(id, {
    enabled: poll?.status === 'published',
  });

  // The socket is the fresher source while connected; the fetched poll is the
  // only one for a closed poll, where no socket is open at all.
  const livePoll = poll && responseCount !== null ? { ...poll, responseCount } : poll;

  if (loading) {
    return (
      <>
        <span className="sr-only" role="status">
          Loading poll
        </span>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-3 h-4 w-2/3" />
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-8 h-64 w-full rounded-lg" />
      </>
    );
  }
  if (error) return <ErrorNote error={error} />;
  if (!poll) return null;

  return (
    <>
      <PageHeader
        title={poll.title}
        description={poll.description}
        actions={
          <>
            {poll.status === 'draft' && (
              <Button
                onClick={async () => {
                  await pollsApi.publish(poll.id);
                  reload();
                }}
              >
                Publish
              </Button>
            )}
            {poll.status === 'published' && (
              <Button
                variant="secondary"
                onClick={async () => {
                  await pollsApi.close(poll.id);
                  reload();
                }}
              >
                {/* On a repeating poll this ends the round, not the poll —
                    another opens on schedule. "Close poll" would be a lie. */}
                {poll.repeatInterval ? 'Close round' : 'Close poll'}
              </Button>
            )}
            {poll.repeatInterval && <EndSeriesAction poll={poll} onEnded={reload} />}
            {poll.status === 'closed' && <ArchiveAction poll={poll} onArchived={reload} />}
            <Button
              variant="ghost"
              onClick={() => analyticsApi.exportCsv(poll.id, poll.slug)}
              disabled={poll.responseCount === 0}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={poll.status === 'published' ? 'good' : 'neutral'}>{poll.status}</Badge>
        <Badge>{poll.type === 'vote' ? 'Quick Vote' : 'Survey'}</Badge>
        <Badge>{DEDUP_LABELS[poll.dedupMode]}</Badge>
        {poll.repeatInterval && (
          <Badge tone="brand">
            Repeats {poll.repeatInterval} · round {poll.round}
          </Badge>
        )}
        <PollTimer
          poll={poll}
          className="text-xs font-medium"
          style={{ color: 'var(--brand-ink)' }}
          // The scheduler acts within the minute; refetch after it, so the page
          // shows the new state rather than a countdown stuck at zero.
          onExpire={() => setTimeout(reload, 65_000)}
        />
        {poll.status === 'published' && (
          <span
            className="ml-auto flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--muted)' }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: connection === 'open' ? 'var(--good)' : 'var(--axis)' }}
              aria-hidden
            />
            {connection === 'open' ? 'Live' : 'Reconnecting…'}
          </span>
        )}
      </div>

      {/* Wraps rather than scrolls. There are at most four short tabs, so a
          scroll container was never going to earn its keep — and on Windows,
          where scrollbars take real space instead of overlaying, it drew a
          bar across the tabs whenever the row came close to the edge. */}
      <nav
        className="mb-6 flex flex-wrap gap-x-6"
        aria-label="Poll sections"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={activeTab === t ? 'page' : undefined}
            className="tab"
            data-active={activeTab === t || undefined}
          >
            {t}
          </button>
        ))}
      </nav>

      {activeTab === 'results' && (
        <ResultsTab poll={livePoll} questions={questions} tallies={tallies} />
      )}
      {activeTab === 'share' && <SharePanel poll={poll} />}
      {activeTab === 'analytics' && <AnalyticsTab poll={poll} />}
      {activeTab === 'series' && <SeriesTab poll={poll} />}
      {activeTab === 'invites' && <InvitesTab poll={poll} />}

      <DeleteAction poll={poll} isAdmin={user?.role === 'admin'} />
    </>
  );
}

/**
 * Archive, behind an inline confirmation.
 *
 * Confirmed in place rather than through window.confirm: a browser dialog
 * blocks the page, looks nothing like the rest of the app, and gives no room
 * to say what archiving actually costs.
 *
 * The warning is specific because the consequence is specific and permanent —
 * the API has publish, close and archive, but no un-archive. Getting a poll
 * back means duplicating it into a fresh draft.
 */
function ArchiveAction({ poll, onArchived }) {
  const [confirming, setConfirming] = useState(false);

  const { execute, pending, error } = useAction(async () => {
    await pollsApi.archive(poll.id);
    setConfirming(false);
    onArchived();
  });

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Archive
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
        Archiving hides this poll and breaks its link. It cannot be undone.
      </span>
      <Button variant="danger" size="sm" loading={pending} onClick={() => execute().catch(() => {})}>
        Archive
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error && (
        <span className="text-xs" style={{ color: 'var(--critical)' }} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

/**
 * Stop a repeating poll for good.
 *
 * Confirmed, because the difference between this and "Close round" is not
 * visible in the button — one ends today's round and another opens tomorrow,
 * the other ends the whole thing. Undoing it means setting the poll to repeat
 * again, which starts a fresh round rather than resuming the old rhythm.
 */
function EndSeriesAction({ poll, onEnded }) {
  const [confirming, setConfirming] = useState(false);

  const { execute, pending, error } = useAction(async () => {
    await pollsApi.endSeries(poll.id);
    setConfirming(false);
    onEnded();
  });

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        End series
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="danger"
        loading={pending}
        onClick={() => execute().catch(() => {})}
        title={`Stops the ${poll.repeatInterval} repeat and closes this round`}
      >
        End for good
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error && (
        <span className="self-center text-xs" style={{ color: 'var(--critical)' }} role="alert">
          {error.message}
        </span>
      )}
    </>
  );
}

/**
 * How a repeating poll has moved across its rounds.
 *
 * A matrix rather than a chart: rounds run across, options down, so a reader
 * scans one row to see whether an answer is gaining or fading. A line chart
 * would look more impressive and read worse at four rounds, which is where
 * most series will sit for a long time.
 *
 * Rounds that have not opened are absent — the API leaves them out rather than
 * reporting a zero that means "not yet" but looks like "nobody".
 */
function SeriesTab({ poll }) {
  const { data, loading, error } = useAsync(() => pollsApi.series(poll.id), [poll.id]);

  if (loading) return <Spinner size={24} />;
  if (error) return <ErrorNote error={error} />;

  const { series, rounds, questions } = data;

  if (rounds.length < 2) {
    return (
      <EmptyState
        title="Only one round so far"
        description={`This poll repeats ${series.repeatInterval}. Once a second round has run, this is where you compare them.`}
      />
    );
  }

  const average = Math.round(series.totalResponses / rounds.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Rounds" value={formatCount(rounds.length)} />
        <StatTile label="Total responses" value={formatCount(series.totalResponses)} />
        <StatTile label="Average per round" value={formatCount(average)} hint="Across all rounds" />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Responses by round</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: 'var(--muted)' }}>
                <th className="py-1.5 pr-3 font-medium">Round</th>
                <th className="py-1.5 pr-3 font-medium">Opened</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 text-right font-medium">Responses</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.round} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-2 pr-3 tabular-nums">{r.round}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--ink-2)' }}>
                    {r.opensAt ? formatDate(r.opensAt) : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={r.status === 'published' ? 'good' : 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatCount(r.responseCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {questions.map((q) => (
        <Card key={q.position}>
          <h2 className="mb-1 text-sm font-semibold">{q.prompt}</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--muted)' }}>
            Votes per option, round by round
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: 'var(--muted)' }}>
                  <th className="py-1.5 pr-3 font-medium">Option</th>
                  {rounds.map((r) => (
                    <th key={r.round} className="py-1.5 pr-3 text-right font-medium tabular-nums">
                      R{r.round}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.options.map((o) => (
                  <tr key={o.position} style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="py-2 pr-3">{o.label ?? `Option ${o.position + 1}`}</td>
                    {rounds.map((r) => (
                      <td key={r.round} className="py-2 pr-3 text-right tabular-nums">
                        {formatCount(o.counts[r.round] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Permanent delete, gated on typing the poll's title.
 *
 * Heavier than the archive confirmation on purpose. Archiving hides your own
 * poll; this destroys other people's submitted responses, and every question,
 * tally and invite code with them. Typing the title is the cheapest way to
 * make sure the click was aimed.
 *
 * Who may delete what is the API's decision — an owner may delete an archived
 * poll, an admin may also delete a closed one. This only mirrors the rule so
 * the button is not offered where it would be refused.
 */
function DeleteAction({ poll, isAdmin }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  const allowed = isAdmin
    ? ['draft', 'closed', 'archived'].includes(poll.status)
    : ['draft', 'archived'].includes(poll.status);

  const { execute, pending, error } = useAction(async () => {
    await pollsApi.remove(poll.id);
    navigate('/dashboard', { replace: true });
  });

  if (!allowed) return null;

  // Deliberately at the foot of the page rather than in the action bar: a
  // permanent delete should not sit beside the buttons pressed routinely.
  if (!open) {
    return (
      <div
        className="mt-10 flex flex-wrap items-center justify-between gap-3 pt-5"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Deleting removes this poll and every response to it, permanently.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Delete poll
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-3" style={{ borderColor: 'var(--critical)' }}>
      <div>
        <h2 className="text-sm font-semibold">Delete this poll permanently</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          {formatCount(poll.responseCount)} responses, every question and all invite codes go
          with it. This cannot be undone.
        </p>
      </div>

      <ErrorNote error={error} />

      <Field label={`Type the poll title to confirm`} htmlFor="confirm-title">
        <Input
          id="confirm-title"
          value={typed}
          placeholder={poll.title}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          size="sm"
          loading={pending}
          disabled={typed.trim() !== poll.title.trim()}
          onClick={() => execute().catch(() => {})}
        >
          Delete permanently
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped('');
          }}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function ResultsTab({ poll, questions, tallies }) {
  const choiceQuestions = questions.filter((q) => CHOICE_TYPES.includes(q.type));

  if (poll.responseCount === 0) {
    return (
      <EmptyState
        title="No responses yet"
        description={
          poll.status === 'draft'
            ? 'Publish the poll to start collecting responses.'
            : 'Share the link and results will appear here as they arrive.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {choiceQuestions.map((question) => {
        const rows = question.options.map((o) => ({
          ...o,
          count: tallies[o.id] ?? o.count ?? 0,
        }));

        return (
          <ChartPanel
            key={question.id}
            title={question.prompt}
            subtitle={`${formatCount(poll.responseCount)} responses`}
            rows={rows}
          >
            {question.type === 'ranking' ? (
              /* No donut and no live tallies here: every respondent ranks
                 every option, so the counts are equal by construction and a
                 share-of-total reading would be nonsense. The standings come
                 from the positions instead. */
              <RankingResults options={question.options} />
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
                <ResultBars options={question.options} tallies={tallies} />
                {/* Donut earns its place only when the split is the story —
                    with two options the bars already say it. */}
                {question.options.length > 2 && (
                  <ShareDonut options={question.options} tallies={tallies} />
                )}
              </div>
            )}
          </ChartPanel>
        );
      })}

      {questions
        .filter((q) => !CHOICE_TYPES.includes(q.type))
        .map((question) => (
          <TextAnswers key={question.id} poll={poll} question={question} />
        ))}
    </div>
  );
}

function TextAnswers({ poll, question }) {
  const { data, loading } = useAsync(
    () => analyticsApi.textAnswers(poll.id, question.id),
    [poll.id, question.id],
  );

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">{question.prompt}</h2>
      <p className="mb-4 text-xs" style={{ color: 'var(--muted)' }}>
        Free-text answers, most recent first
      </p>

      {loading ? (
        <Spinner size={20} />
      ) : (data?.answers ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No answers yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.answers.map((a, i) => (
            <li
              key={i}
              className="rounded-lg px-3.5 py-3 text-sm"
              style={{ background: 'var(--plane)', border: '1px solid var(--line)' }}
            >
              <p>{a.value_text}</p>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                <time>{formatDate(a.submitted_at)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AnalyticsTab({ poll }) {
  const { data, loading, error } = useAsync(() => analyticsApi.get(poll.id), [poll.id]);

  if (loading) return <Spinner size={24} />;
  if (error) return <ErrorNote error={error} />;

  const { summary, responsesOverTime, questions } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Responses" value={formatCount(summary.responses)} />
        <StatTile
          label="Completion rate"
          value={`${summary.completionRate}%`}
          hint="Finished vs started"
        />
        <StatTile
          label="Identified"
          value={formatCount(summary.identified)}
          hint="Signed-in respondents"
        />
        <StatTile
          label="First response"
          value={summary.first_response ? formatDate(summary.first_response) : '—'}
        />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Responses over time</h2>
        <TrendChart points={responsesOverTime} />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Drop-off by question</h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--muted)' }}>
          Share of people who started but did not answer each question.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: 'var(--muted)' }}>
                <th className="py-1.5 pr-3 font-medium">#</th>
                <th className="py-1.5 pr-3 font-medium">Question</th>
                <th className="py-1.5 pr-3 text-right font-medium">Answered</th>
                <th className="py-1.5 text-right font-medium">Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-2 pr-3 tabular-nums" style={{ color: 'var(--muted)' }}>
                    {q.position + 1}
                  </td>
                  <td className="py-2 pr-3">{q.prompt}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCount(q.answered)}</td>
                  <td
                    className="py-2 text-right tabular-nums"
                    // Only the number is colored, and it is always labeled by
                    // its column — color is never the only signal.
                    style={{ color: q.dropOffPct > 25 ? 'var(--critical)' : 'var(--ink-2)' }}
                  >
                    {q.dropOffPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function InvitesTab({ poll }) {
  const { data, loading, reload } = useAsync(() => invitesApi.list(poll.id), [poll.id]);
  const [count, setCount] = useState(10);
  const [issued, setIssued] = useState(null);

  const { execute, pending, error } = useAction(async () => {
    const res = await invitesApi.issue(poll.id, { count: Number(count) });
    setIssued(res.codes);
    reload();
  });

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Invite codes</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            Each code admits exactly one response. Use these when the poll must be limited to a
            known group — a committee vote, a members' election.
          </p>
        </div>

        <ErrorNote error={error} />

        <div className="flex flex-wrap items-end gap-3">
          <Field label="How many" htmlFor="count">
            <Input
              id="count"
              type="number"
              min={1}
              max={500}
              value={count}
              className="w-28"
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
          <Button loading={pending} onClick={() => execute().catch(() => {})}>
            Issue codes
          </Button>
        </div>

        {issued && (
          <div>
            {/* Shown once — the API stores only hashes, so there is no second
                chance to read them. */}
            <p className="mb-2 text-sm font-medium">
              Copy these now — they cannot be shown again.
            </p>
            <div
              className="max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs"
              style={{ background: 'var(--plane)' }}
            >
              {issued.map((c) => (
                <div key={c.code}>{c.code}</div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Issued</h2>
        {loading ? (
          <Spinner size={20} />
        ) : (
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            {formatCount(data?.stats?.used ?? 0)} of {formatCount(data?.stats?.issued ?? 0)} codes
            used.
          </p>
        )}
      </Card>

    </div>
  );
}
