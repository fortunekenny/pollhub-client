import { Input, Textarea, Select, Field, Button, Card } from './ui.jsx';
import { ImageUploader } from './ImageUploader.jsx';
import { QUESTION_TYPE_LABELS, CHOICE_TYPES } from '../lib/format.js';

const TYPES = Object.keys(QUESTION_TYPE_LABELS);

export function QuestionEditor({ question, index, total, onChange, onRemove, onMove, error }) {
  const isChoice = CHOICE_TYPES.includes(question.type);

  function setType(type) {
    const next = { ...question, type };

    // Switching into a choice type needs somewhere to put options; switching
    // out must drop them, because the API rejects options on a text question.
    if (CHOICE_TYPES.includes(type) && question.options.length < 2) {
      next.options = [{ label: '' }, { label: '' }];
    }
    if (!CHOICE_TYPES.includes(type)) next.options = [];
    if (type === 'yes_no') next.options = [{ label: 'Yes' }, { label: 'No' }];
    if (type === 'rating') next.config = { max: question.config?.max ?? 5 };

    onChange(next);
  }

  function setOption(i, patch) {
    const options = question.options.map((o, oi) => (oi === i ? { ...o, ...patch } : o));
    onChange({ ...question, options });
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-4">
        {/* A numbered chip rather than a loose grey digit: in a long survey
            this column is how you keep your place while scrolling. */}
        <span
          className="mt-7 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          data-numeric
          style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
          aria-hidden
        >
          {index + 1}
        </span>

        <div className="flex-1 space-y-3">
          <Field label="Question" htmlFor={`q-${index}`} required error={error}>
            <Input
              id={`q-${index}`}
              value={question.prompt}
              placeholder="What do you want to ask?"
              invalid={Boolean(error)}
              onChange={(e) => onChange({ ...question, prompt: e.target.value })}
            />
          </Field>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Type" htmlFor={`t-${index}`}>
              <Select
                id={`t-${index}`}
                value={question.type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>

            {question.type === 'rating' && (
              <Field label="Scale" htmlFor={`s-${index}`}>
                <Select
                  id={`s-${index}`}
                  value={question.config?.max ?? 5}
                  onChange={(e) =>
                    onChange({ ...question, config: { max: Number(e.target.value) } })
                  }
                >
                  <option value={5}>1 – 5</option>
                  <option value={10}>1 – 10</option>
                </Select>
              </Field>
            )}

            <label className="flex items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onChange({ ...question, required: e.target.checked })}
              />
              Required
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Move question up"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Move question down"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            ↓
          </Button>
          {total > 1 && (
            <Button size="sm" variant="ghost" aria-label="Remove question" onClick={onRemove}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {isChoice && question.type !== 'yes_no' && (
        <div className="space-y-2 pl-6">
          <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            Options
          </p>

          {question.options.map((option, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                className="flex-1 min-w-48"
                value={option.label ?? ''}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
                onChange={(e) => setOption(i, { label: e.target.value })}
              />
              <ImageUploader
                kind="option"
                value={option.imagePublicId}
                onChange={(publicId) => setOption(i, { imagePublicId: publicId })}
                label="Image"
              />
              {question.options.length > 2 && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() =>
                    onChange({
                      ...question,
                      options: question.options.filter((_, oi) => oi !== i),
                    })
                  }
                >
                  ✕
                </Button>
              )}
            </div>
          ))}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChange({ ...question, options: [...question.options, { label: '' }] })}
          >
            Add option
          </Button>

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            An option needs a label, an image, or both.
          </p>
        </div>
      )}

      {question.type === 'long_text' && (
        <div className="pl-6">
          <Textarea disabled placeholder="Respondents will see a long text box here" />
        </div>
      )}
    </Card>
  );
}

export function emptyQuestion(type = 'single_choice') {
  return {
    type,
    prompt: '',
    required: true,
    config: {},
    options: CHOICE_TYPES.includes(type) ? [{ label: '' }, { label: '' }] : [],
  };
}
