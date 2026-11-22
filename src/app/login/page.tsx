'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Loader2, ArrowRight } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function resetErrors() {
    setErrorMessage(null);
  }

  async function handleDemoLogin() {
    setIsDemoLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(data?.error ?? 'Could not start demo session. Please try again.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Could not sign in with demo. Please check your connection.');
    } finally {
      setIsDemoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      const cleanName = name.trim();
      if (!cleanName) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (cleanPassword.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = mode === 'signup'
        ? { name: name.trim(), email: cleanEmail, password: cleanPassword }
        : { email: cleanEmail, password: cleanPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMessage(data?.error ?? 'Authentication failed. Please verify your details.');
        return;
      }

      // Success
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Network error during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm mb-1 ring-1 ring-primary/20">
            <span className="text-2xl font-bold font-serif">K</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kairos
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Home Tutor Invoicing, Cash Forecast & Billing
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8 space-y-6">
          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 rounded-xl bg-muted/60 p-1 text-sm font-semibold text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                resetErrors();
              }}
              className={`rounded-lg py-2 text-center transition-all ${
                mode === 'signin'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                resetErrors();
              }}
              className={`rounded-lg py-2 text-center transition-all ${
                mode === 'signup'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in-50"
            >
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="auth-name">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading || isDemoLoading}
                    className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="auth-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="tutor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isDemoLoading}
                  className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="auth-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isDemoLoading}
                  className="w-full rounded-xl border border-input bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 transition"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isDemoLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Creating account…' : 'Signing in…'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Helper Link */}
          <div className="text-center text-xs text-muted-foreground">
            {mode === 'signin' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    resetErrors();
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    resetErrors();
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          {/* Visual Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-card px-3 text-muted-foreground font-semibold">
                Or Try Demo Mode
              </span>
            </div>
          </div>

          {/* Demo Action Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading || isDemoLoading}
              className="w-full group relative flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 p-3.5 text-left transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition">
                    Continue as Demo
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Instant access with sample students, bills & invoices
                  </div>
                </div>
              </div>
              <div>
                {isDemoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted-foreground">
          Protected session • Data stored locally in PostgreSQL
        </p>
      </div>
    </div>
  );
}
