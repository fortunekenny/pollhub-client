import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pollsApi } from '../lib/api.js';
import { useAction, useDocumentTitle } from '../lib/hooks.js';
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Select,
  ErrorNote,
  PageHeader,
} from '../components/ui.jsx';
import { QuestionEditor, emptyQuestion } from '../components/QuestionEditor.jsx';
import { ImageUploader } from '../components/ImageUploader.jsx';
import {
  DEDUP_LABELS,
  IDENTITY_LABELS,
  RESULTS_LABELS,
  VISIBILITY_LABELS,
  formatDate,
} from '../lib/format.js';

/**
 * How long a poll runs, as durations rather than dates.
 *
 * Hours, not days, as the unit — a day is not always 24 hours across a DST
 * boundary, but adding hours to a timestamp is unambiguous, and the result is
 * shown back to the creator before they publish either way.
 */
const DURATIONS = [
  { key: 'none', label: 'Until I close it', hours: null },
  { key: '1h', label: '1 hour', hours: 1 },
  { key: '6h', label: '6 hours', hours: 6 },
  { key: '1d', label: '1 day', hours: 24 },
  { key: '3d', label: '3 days', hours: 72 },
  { key: '1w', label: '1 week', hours: 168 },
  { key: '2w', label: '2 weeks', hours: 336 },
  { key: '1m', label: '1 month', hours: 720 },
  { key: 'custom', label: 'Pick a date and time', hours: null },
];

/** A Date as the value a datetime-local input expects, in local time. */
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function Builder() {
  useDocumentTitle('New poll');
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // null until they pick, so step 1 is a real choice
  const [poll, setPoll] = useState({
    type: 'vote',
    title: '',
    description: '',
    visibility: 'unlisted',
    identityMode: 'anonymous',
    dedupMode: 'cookie_device',
    resultsMode: 'after_vote',
    coverPublicId: null,
    opensAt: '',
    closesAt: '',
    questions: [emptyQuestion()],
  });

  const [runsFor, setRunsFor] = useState('none');

  /**
   * Turn a chosen duration into the absolute closesAt the API stores.
   *
   * Counted from the opening time when one is set, so "1 week" means a week of
   * open voting rather than a week from whenever the poll was drafted.
   */
  function applyDuration(key) {
    setRunsFor(key);
    const choice = DURATIONS.find((d) => d.key === key);

    if (key === 'none') {
      setPoll((p) => ({ ...p, closesAt: '' }));
      return;
    }
    // Custom keeps whatever is already there and reveals the picker.
    if (!choice?.hours) return;

    const base = poll.opensAt ? new Date(poll.opensAt) : new Date();
    setPoll((p) => ({
      ...p,
      closesAt: toLocalInput(new Date(base.getTime() + choice.hours * 3_600_000)),
    }));
  }

  const { execute, pending, error } = useAction(async (publish) => {
    const payload = {
      ...poll,
      description: poll.description || undefined,
      coverPublicId: poll.coverPublicId || undefined,
      opensAt: poll.opensAt ? new Date(poll.opensAt).toISOString() : undefined,
      closesAt: poll.closesAt ? new Date(poll.closesAt).toISOString() : undefined,
      // Blank option rows are a builder artefact, not user intent.
      questions: poll.questions.map((q) => ({
        ...q,
        options: q.options.filter((o) => o.label?.trim() || o.imagePublicId),
      })),
    };

    const { poll: created } = await pollsApi.create(payload);
    if (publish) await pollsApi.publish(created.id);
    navigate(`/polls/${created.id}`, { replace: true });
  });

  const fieldErrors = error?.fieldErrors ?? {};

  function set(patch) {
    setPoll((p) => ({ ...p, ...patch }));
  }

  function setQuestion(i, next) {
    set({ questions: poll.questions.map((q, qi) => (qi === i ? next : q)) });
  }

  function moveQuestion(from, to) {
    const questions = [...poll.questions];
    const [moved] = questions.splice(from, 1);
    questions.splice(to, 0, moved);
    set({ questions });
  }

  if (mode === null) {
    return (
      <>
        <PageHeader
          title="What are you making?"
          description="You can change everything else later — this only sets how many questions the poll can hold."
        />
        {/* The two choices are cards rather than a select: this is the first
            decision in the flow and the difference between them is a sentence,
            not a word. `brightness` was the old hover — it darkens an already
            dark card in dark mode, so the lift replaces it. */}
        <div className="grid gap-5 sm:grid-cols-2">
          <button
            type="button"
            className="card card-interactive p-6 text-left"
            onClick={() => {
              setMode('vote');
              set({ type: 'vote', questions: [emptyQuestion()] });
            }}
          >
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 19V11M12 19V5M19 19v-5" />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold">Quick Vote</h2>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
              One question, a set of options, published in under a minute. Best for "where should
              we meet?" and one-off decisions.
            </p>
          </button>

          <button
            type="button"
            className="card card-interactive p-6 text-left"
            onClick={() => {
              setMode('survey');
              set({ type: 'survey' });
            }}
          >
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold">Survey</h2>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
              Multiple questions with mixed types — choice, rating, free text. Best for feedback
              and research.
            </p>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={mode === 'vote' ? 'New Quick Vote' : 'New Survey'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Change type
            </Button>
            <Button variant="secondary" loading={pending} onClick={() => execute(false).catch(() => {})}>
              Save draft
            </Button>
            <Button loading={pending} onClick={() => execute(true).catch(() => {})}>
              Publish
            </Button>
          </>
        }
      />

      <ErrorNote error={error?.status === 422 ? null : error} className="mb-4" />
      {error?.status === 422 && (
        <ErrorNote
          error={{ message: 'Some fields need attention — see the messages below.' }}
          className="mb-4"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <Field label="Title" htmlFor="title" required error={fieldErrors.title}>
              <Input
                id="title"
                value={poll.title}
                placeholder="Where should we hold the meetup?"
                invalid={Boolean(fieldErrors.title)}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>

            <Field label="Description" htmlFor="description" hint="Optional context for respondents.">
              <Textarea
                id="description"
                value={poll.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </Field>

            <Field label="Cover image" hint="Shown on the poll page and in share cards.">
              <ImageUploader
                kind="cover"
                value={poll.coverPublicId}
                onChange={(id) => set({ coverPublicId: id })}
                label="Add cover"
              />
            </Field>
          </Card>

          {poll.questions.map((question, i) => (
            <QuestionEditor
              key={i}
              index={i}
              total={poll.questions.length}
              question={question}
              error={fieldErrors[`questions.${i}.prompt`]}
              onChange={(next) => setQuestion(i, next)}
              onMove={moveQuestion}
              onRemove={() => set({ questions: poll.questions.filter((_, qi) => qi !== i) })}
            />
          ))}

          {/* A Quick Vote is one question by definition — the API rejects a
              second one, so the button is not offered. */}
          {mode === 'survey' && (
            <Button
              variant="secondary"
              onClick={() => set({ questions: [...poll.questions, emptyQuestion()] })}
            >
              Add question
            </Button>
          )}
        </div>

        <aside className="space-y-5">
          <Card className="space-y-5">
            <h2 className="text-base font-semibold">Settings</h2>

            <Field label="Who can find it" htmlFor="visibility">
              <Select
                id="visibility"
                value={poll.visibility}
                onChange={(e) => set({ visibility: e.target.value })}
              >
                {Object.entries(VISIBILITY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Respondent identity" htmlFor="identity">
              <Select
                id="identity"
                value={poll.identityMode}
                onChange={(e) => {
                  const identityMode = e.target.value;
                  // Requiring an account while deduping by device is a
                  // mismatch; move it to account dedup so the poll does what
                  // the creator clearly means.
                  const dedupMode =
                    identityMode === 'account_required' && poll.dedupMode === 'none'
                      ? 'account'
                      : poll.dedupMode;
                  set({ identityMode, dedupMode });
                }}
              >
                {Object.entries(IDENTITY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Duplicate protection"
              htmlFor="dedup"
              hint={DEDUP_LABELS[poll.dedupMode]}
              error={fieldErrors.dedupMode}
            >
              <Select
                id="dedup"
                value={poll.dedupMode}
                onChange={(e) => set({ dedupMode: e.target.value })}
              >
                {Object.keys(DEDUP_LABELS).map((v) => (
                  <option key={v} value={v}>
                    {DEDUP_LABELS[v]}
                  </option>
                ))}
              </Select>
            </Field>

            {poll.dedupMode === 'ip' && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                People sharing a network — an office, a campus, one household — will be treated as
                one respondent.
              </p>
            )}

            <Field label="Who sees results" htmlFor="results">
              <Select
                id="results"
                value={poll.resultsMode}
                onChange={(e) => set({ resultsMode: e.target.value })}
              >
                {Object.entries(RESULTS_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-base font-semibold">Schedule</h2>
            <Field label="Opens" htmlFor="opens" hint="Leave blank to open on publish.">
              <Input
                id="opens"
                type="datetime-local"
                value={poll.opensAt}
                onChange={(e) => set({ opensAt: e.target.value })}
              />
            </Field>

            {/* A duration rather than a date. "Closes in a week" is how people
                describe a poll; working out what next Tuesday's date is, and
                typing it in a picker, is not. The absolute time is still what
                gets stored — this only computes it. */}
            <Field label="Runs for" htmlFor="runs-for" hint="Counted from the opening time.">
              <Select
                id="runs-for"
                value={runsFor}
                onChange={(e) => applyDuration(e.target.value)}
              >
                {DURATIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>

            {runsFor === 'custom' && (
              <Field
                label="Closes"
                htmlFor="closes"
                hint="Exact date and time."
                error={fieldErrors.closesAt}
              >
                <Input
                  id="closes"
                  type="datetime-local"
                  value={poll.closesAt}
                  invalid={Boolean(fieldErrors.closesAt)}
                  onChange={(e) => set({ closesAt: e.target.value })}
                />
              </Field>
            )}

            {runsFor !== 'custom' && runsFor !== 'none' && poll.closesAt && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Closes {formatDate(poll.closesAt)}
              </p>
            )}
          </Card>

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Identity and duplicate-protection settings lock once the first response arrives — the
            results have to mean one consistent thing.
          </p>
        </aside>
      </div>
    </>
  );
}
