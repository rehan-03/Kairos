'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorCardProps {
  status?: number | string | null;
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorCard({
  status,
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = '',
}: ErrorCardProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-rose-200 bg-rose-50/80 p-5 text-rose-900 shadow-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-rose-950 dark:text-rose-100">
            {status ? `Request Failed (HTTP ${status})` : 'Unable to load content'}
          </h3>
          <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-300/90 break-words">
            {message}
          </p>
          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-300 bg-card px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition-colors dark:border-rose-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
