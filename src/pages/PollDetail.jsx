import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pollsApi, analyticsApi, invitesApi } from '../lib/api.js';
import { useAsync, useAction, useDocumentTitle } from '../lib/hooks.js';
import { useLiveTallies } from '../lib/useLiveTallies.js';
import { formatCount, formatDate, relativeTime, DEDUP_LABELS, CHOICE_TYPES } from '../lib/format.js';
import {
  Button,
  Badge,
  Card,
  ErrorNote,
  PageHeader,
  Spinner,
  Field,
  Input,
} from '../components/ui.jsx';
import { SharePanel } from '../components/SharePanel.jsx';
import { ResultBars } from '../components/charts/ResultBars.jsx';
import { ShareDonut } from '../components/charts/ShareDonut.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { ChartPanel, StatTile } from '../components/charts/ChartPanel.jsx';

export function PollDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('results');

  const { data, loading, error, reload } = useAsync(() => pollsApi.get(id), [id]);
  const poll = data?.poll;
  const questions = data?.questions ?? [];

  useDocumentTitle(poll?.title);

  // Live only matters while the poll is open; a closed poll's numbers are final.
  const { tallies, connection } = useLiveTallies(id, { enabled: poll?.status === 'published' });

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} label="Loading poll" />
      </div>
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
                Close poll
              </Button>
            )}
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
        {poll.closesAt && poll.status === 'published' && (
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Closes {relativeTime(poll.closesAt)}
          </span>
        )}
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

      <nav className="mb-5 flex gap-1" aria-label="Poll sections">
        {['results', 'share', 'analytics', 'invites'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className="rounded-lg px-3 py-1.5 text-sm capitalize transition"
            style={
              tab === t
                ? { background: 'var(--surface)', border: '1px solid var(--ring)' }
                : { color: 'var(--ink-2)' }
            }
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'results' && (
        <ResultsTab poll={poll} questions={questions} tallies={tallies} />
      )}
      {tab === 'share' && <SharePanel poll={poll} />}
      {tab === 'analytics' && <AnalyticsTab poll={poll} />}
      {tab === 'invites' && <InvitesTab poll={poll} />}
    </>
  );
}

function ResultsTab({ poll, questions, tallies }) {
  const choiceQuestions = questions.filter((q) => CHOICE_TYPES.includes(q.type));

  if (poll.responseCount === 0) {
    return (
      <Card className="py-12 text-center">
        <p className="font-medium">No responses yet</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          {poll.status === 'draft'
            ? 'Publish the poll to start collecting responses.'
            : 'Share the link and results will appear here as they arrive.'}
        </p>
      </Card>
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
            <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
              <ResultBars options={question.options} tallies={tallies} />
              {/* Donut earns its place only when the split is the story —
                  with two options the bars already say it. */}
              {question.options.length > 2 && (
                <ShareDonut options={question.options} tallies={tallies} />
              )}
            </div>
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
      <h2 className="mb-1 text-sm font-semibold">{question.prompt}</h2>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
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
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--plane)' }}
            >
              <p>{a.value_text}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                {formatDate(a.submitted_at)}
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

      {poll.dedupMode !== 'invite_code' && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          This poll's duplicate protection is set to "{DEDUP_LABELS[poll.dedupMode]}", so invite
          codes are not currently required to respond.{' '}
          <Link to={`/polls/${poll.id}`} style={{ color: 'var(--brand-ink)' }}>
            Change it in settings
          </Link>{' '}
          — note that it locks after the first response.
        </p>
      )}
    </div>
  );
}
