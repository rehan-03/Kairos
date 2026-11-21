'use client';

import Link from 'next/link';
import { AlertTriangle, AlertOctagon, Info, ArrowRight } from 'lucide-react';

export type AlertSeverity = 'danger' | 'warning' | 'info';

export interface AlertCardProps {
  title?: string | null;
  reason?: string | null;
  severity?: AlertSeverity;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    label: string;
    badgeClass: string;
    borderClass: string;
    icon: typeof AlertTriangle;
    iconClass: string;
  }
> = {
  danger: {
    label: 'Urgent',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    borderClass: 'border-l-4 border-l-rose-600',
    icon: AlertOctagon,
    iconClass: 'text-rose-600',
  },
  warning: {
    label: 'Action needed',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    borderClass: 'border-l-4 border-l-amber-500',
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
  },
  info: {
    label: 'Info',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    borderClass: 'border-l-4 border-l-sky-500',
    icon: Info,
    iconClass: 'text-sky-500',
  },
};

const BUTTON_CLASS =
  'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius)] bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto';

export default function AlertCard({
  title,
  reason,
  severity = 'warning',
  actionLabel = 'Open',
  actionHref,
  onAction,
}: AlertCardProps) {
  if (!title) {
    return (
      <div className="w-full rounded-[var(--radius)] border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground shadow-sm">
        Nothing needs action right now. All alerts are cleared!
      </div>
    );
  }

  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.warning;
  const Icon = config.icon;

  let actionNode: React.ReactNode = null;
  if (actionHref) {
    actionNode = (
      <Link href={actionHref} className={BUTTON_CLASS}>
        <span>{actionLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  } else if (onAction) {
    actionNode = (
      <button type="button" onClick={onAction} className={BUTTON_CLASS}>
        <span>{actionLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <article
      data-nexen-component="nx_components_AlertCard"
      className={`w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md ${config.borderClass}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconClass}`} />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-semibold text-foreground">
              {title}
            </h3>
            {reason ? (
              <p className="mt-1 break-words text-xs text-muted-foreground leading-relaxed">
                {reason}
              </p>
            ) : null}
          </div>
        </div>

        <span
          className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}
        >
          {config.label}
        </span>
      </div>

      {actionNode ? (
        <div className="mt-3 flex sm:justify-end border-t border-border/40 pt-2.5">
          {actionNode}
        </div>
      ) : null}
    </article>
  );
}
