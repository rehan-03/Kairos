import Link from 'next/link';

export type EmptyStateAction = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

export interface EmptyStateProps {
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
}

const BUTTON_BASE =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] px-4 text-sm font-semibold transition-colors';

const BUTTON_VARIANTS: Record<NonNullable<EmptyStateAction['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-secondary',
  secondary: 'border border-border bg-card text-foreground hover:bg-muted',
};

export default function EmptyState({ title, description, actions }: EmptyStateProps) {
  const safeActions = Array.isArray(actions) ? actions : [];

  return (
    <section data-nexen-component="nx_components_EmptyState"
      role="status"
      className="flex w-full min-w-0 flex-col items-center gap-4 rounded-[var(--radius)] border border-border bg-card px-6 py-10 text-center shadow-sm"
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      </div>

      <div className="flex w-full max-w-md min-w-0 flex-col gap-1">
        <h2 className="break-words text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="break-words text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {safeActions.length > 0 ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {safeActions.map((action) => {
            const variant = action.variant ?? 'primary';
            return (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} w-full sm:w-auto`}
              >
                {action.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}