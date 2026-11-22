import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { isReminderError, createReminder } from '@/modules/reminders';

const TONES = ['friendly', 'firm', 'final'] as const;
const LANGUAGES = ['english', 'hinglish'] as const;

type Tone = (typeof TONES)[number];
type Language = (typeof LANGUAGES)[number];

function isTone(value: unknown): value is Tone {
  return typeof value === 'string' && (TONES as readonly string[]).includes(value);
}

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoiceId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  if (!isTone(input.tone)) {
    return NextResponse.json(
      { error: 'Choose a tone: friendly, firm or final.' },
      { status: 400 },
    );
  }

  if (input.language !== undefined && !isLanguage(input.language)) {
    return NextResponse.json(
      { error: 'Language must be english or hinglish.' },
      { status: 400 },
    );
  }

  try {
    const reminder = await createReminder(invoiceId, {
      invoiceId,
      tone: input.tone,
      language: isLanguage(input.language) ? input.language : undefined,
    });
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (e) {
    if (isReminderError(e)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}