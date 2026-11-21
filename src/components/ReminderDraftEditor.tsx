'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, updateReminder } from '@/lib/api';

const MAX_LENGTH = 1000;

export interface ReminderDraftEditorProps {
  reminderId: string;
  initialBody: string;
  amount: string;
  dueDate: string;
  upiId: string;
  onSaved?: (messageBody: string) => void;
}

export default function ReminderDraftEditor({
  reminderId,
  initialBody,
  amount,
  dueDate,
  upiId,
  onSaved,
}: ReminderDraftEditorProps) {
  const [body, setBody] = useState<string>(initialBody ?? '');
  const [savedBody, setSavedBody] = useState<string>(initialBody ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const isDirty = body !== savedBody;

  function validate(text: string): string | null {
    if (text.trim().length === 0) {
      return 'Please write a message before sending.';
    }
    if (text.length > MAX_LENGTH) {
      return 'Your message is too long. Please keep it under 1000 characters.';
    }
    const hasFigures =
      text.includes(amount) && text.includes(dueDate) && text.includes(upiId);
    if (!hasFigures) {
      return 'Your message must include the amount, due date and UPI ID. Please add them back before sending.';
    }
    return null;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate(body);
    setError(validationError);
    setJustSaved(false);
    if (validationError) return;

    setIsSaving(true);
    try {
      await updateReminder(reminderId, { messageBody: body });
      setSavedBody(body);
      setJustSaved(true);
      onSaved?.(body);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not save the draft. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleRevert() {
    setBody(savedBody);
    setError(null);
    setJustSaved(false);
  }

  function handleChange(value: string) {
    setBody(value);
    setJustSaved(false);
    if (error) setError(null);
  }

  return (
    <form data-nexen-component="nx_components_ReminderDraftEditor"
      onSubmit={handleSave}
      className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
    >
      <label
        htmlFor={`reminder-body-${reminderId}`}
        className="mb-2 block text-sm font-semibold text-foreground"
      >
        Reminder message
      </label>

      <textarea
        id={`reminder-body-${reminderId}`}
        value={body}
        onChange={(event) => handleChange(event.target.value)}
        rows={8}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `reminder-error-${reminderId}` : `reminder-hint-${reminderId}`}
        className="block w-full min-w-0 resize-y rounded-[var(--radius)] border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p id={`reminder-hint-${reminderId}`} className="min-w-0">
          Must include {amount}, due {dueDate} and UPI ID {upiId}.
        </p>
        <span className="shrink-0 tabular-nums">
          {body.length}/{MAX_LENGTH}
        </span>
      </div>

      {error && (
        <p
          id={`reminder-error-${reminderId}`}
          role="alert"
          className="mt-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {justSaved && !error && (
        <p role="status" className="mt-3 text-sm font-medium text-primary">
          Draft saved.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleRevert}
          disabled={!isDirty || isSaving}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard changes
        </button>
        <button
          type="submit"
          disabled={!isDirty || isSaving}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </form>
  );
}