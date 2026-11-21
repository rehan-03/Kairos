import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const safeTitle = typeof title === 'string' ? title : '';
  const safeSubtitle = typeof subtitle === 'string' ? subtitle : '';

  return (
    <header data-nexen-component="nx_components_PageHeader" className="w-full border-b border-border bg-card/60 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <h1 className="font-sans break-words text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            {safeTitle}
          </h1>
          {safeSubtitle ? (
            <p className="mt-1 break-words text-xs sm:text-sm text-muted-foreground">{safeSubtitle}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
