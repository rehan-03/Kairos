
'use client';

export type HorizonValue = '30' | '60' | '90';

interface HorizonSwitchProps {
  value?: HorizonValue | number;
  onChange?: (value: HorizonValue) => void;
  disabled?: boolean;
}

const OPTIONS: { value: HorizonValue; label: string }[] = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
];

export default function HorizonSwitch(props: HorizonSwitchProps) {
  const { value = '30', onChange, disabled = false } = props;
  const selected = String(value);

  const handleSelect = (next: HorizonValue) => {
    if (disabled || next === selected) return;
    if (typeof onChange === 'function') {
      onChange(next);
    }
  };

  return (
    <div
      role="group"
      aria-label="Forecast horizon"
      className="inline-flex w-full max-w-full flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-card p-1 shadow-sm sm:w-auto"
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === selected;
        return (
          <button data-nexen-component="nx_components_HorizonSwitch"
            key={option.value}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => handleSelect(option.value)}
            className={[
              'min-w-0 flex-1 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'sm:flex-none',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}