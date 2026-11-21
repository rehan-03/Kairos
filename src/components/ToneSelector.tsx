'use client';

import type { KeyboardEvent } from 'react';

export type ReminderTone = 'friendly' | 'firm' | 'final';

export interface ToneSelectorProps {
  value?: ReminderTone | string;
  onChange: (tone: ReminderTone) => void;
  disabled?: boolean;
}

interface ToneOption {
  tone: ReminderTone;
  label: string;
  description: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    tone: 'friendly',
    label: 'Friendly',
    description: 'A warm nudge that assumes it slipped their mind.',
  },
  {
    tone: 'firm',
    label: 'Firm',
    description: 'A clear request with the due date stated plainly.',
  },
  {
    tone: 'final',
    label: 'Final',
    description: 'A last notice before further action is taken.',
  },
];

export default function ToneSelector({ value, onChange, disabled = false }: ToneSelectorProps) {
  const options = Array.isArray(TONE_OPTIONS) ? TONE_OPTIONS : [];
  const selected: ReminderTone | undefined = options.some((o) => o.tone === value)
    ? (value as ReminderTone)
    : undefined;

  const selectByIndex = (index: number) => {
    const next = options[(index + options.length) % options.length];
    if (next && !disabled) {
      onChange(next.tone);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectByIndex(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectByIndex(index - 1);
    }
  };

  return (
    <div className="w-full min-w-0">
      <p className="mb-2 text-sm font-medium text-foreground">Reminder tone</p>
      <div
        role="radiogroup"
        aria-label="Reminder tone"
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {options.map((option, index) => {
          const isSelected = selected === option.tone;
          return (
            <button data-nexen-component="nx_components_ToneSelector"
              key={option.tone}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!selected && index === 0) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.tone)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={[
                'min-w-0 w-full text-left rounded-[var(--radius)] border p-3',
                'shadow-sm transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    isSelected ? 'border-primary' : 'border-border',
                  ].join(' ')}
                >
                  {isSelected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                </span>
                <span className="text-sm font-semibold">{option.label}</span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}