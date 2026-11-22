'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function continueAsDemo() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorMessage(body?.error ?? 'Could not sign in. Try again.');
        return;
      }
      router.push('/');
    } catch {
      setErrorMessage('Could not sign in. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-4">
      <h1 className="text-2xl font-semibold text-foreground">Kairos</h1>

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={continueAsDemo}
        disabled={isLoading}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {isLoading ? 'Signing in…' : 'Continue as demo'}
      </button>
    </div>
  );
}
