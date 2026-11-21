'use client';

import { useEffect, useState } from 'react';

export interface WhatsAppSendButtonProps {
  phone: string;
  message: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  onSent?: () => void;
}

type Feedback = 'idle' | 'opened' | 'copied' | 'error';

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile/i;

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export default function WhatsAppSendButton({
  phone,
  message,
  label = 'Send on WhatsApp',
  disabled = false,
  className = '',
  onSent,
}: WhatsAppSendButtonProps) {
  const [feedback, setFeedback] = useState<Feedback>('idle');

  useEffect(() => {
    if (feedback === 'idle') return;
    const timer = window.setTimeout(() => setFeedback('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleClick = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!digits || !message.trim()) {
      setFeedback('error');
      return;
    }

    const isMobile =
      typeof navigator !== 'undefined' && MOBILE_UA.test(navigator.userAgent);

    if (isMobile) {
      window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
      setFeedback('opened');
      onSent?.();
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setFeedback('copied');
      onSent?.();
    } catch {
      setFeedback('error');
    }
  };

  const feedbackText: Record<Feedback, string> = {
    idle: '',
    opened: 'WhatsApp opened with the message ready.',
    copied: 'Message copied. Paste it into WhatsApp.',
    error: 'Could not send. Check the phone number and try again.',
  };

  const feedbackTone =
    feedback === 'error' ? 'text-[hsl(var(--destructive))]' : 'text-muted-foreground';

  return (
    <div data-nexen-component="nx_components_WhatsAppSendButton" className={`flex w-full flex-col gap-2 sm:w-auto sm:items-start ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.8A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
        <span className="min-w-0 truncate">{label}</span>
      </button>

      {feedback !== 'idle' && (
        <p role="status" aria-live="polite" className={`text-xs ${feedbackTone}`}>
          {feedbackText[feedback]}
        </p>
      )}
    </div>
  );
}