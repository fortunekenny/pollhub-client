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
} from '../lib/format.js';

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
        <PageHeader title="What are you making?" />
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="card p-6 text-left transition hover:brightness-[0.98]"
            onClick={() => {
              setMode('vote');
              set({ type: 'vote', questions: [emptyQuestion()] });
            }}
          >
            <h2 className="font-semibold">Quick Vote</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
              One question, a set of options, published in under a minute. Best for "where should
              we meet?" and one-off decisions.
            </p>
          </button>

          <button
            type="button"
            className="card p-6 text-left transition hover:brightness-[0.98]"
            onClick={() => {
              setMode('survey');
              set({ type: 'survey' });
            }}
          >
            <h2 className="font-semibold">Survey</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
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
        <div className="space-y-4">
          <Card className="space-y-4">
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

        <aside className="space-y-4">
          <Card className="space-y-4">
            <h2 className="text-sm font-semibold">Settings</h2>

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
            <h2 className="text-sm font-semibold">Schedule</h2>
            <Field label="Opens" htmlFor="opens" hint="Leave blank to open on publish.">
              <Input
                id="opens"
                type="datetime-local"
                value={poll.opensAt}
                onChange={(e) => set({ opensAt: e.target.value })}
              />
            </Field>
            <Field
              label="Closes"
              htmlFor="closes"
              hint="Leave blank to close manually."
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
