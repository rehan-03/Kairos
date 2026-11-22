import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import {
  isReminderError,
  getReminderById,
  updateReminder,
} from '@/modules/reminders';

const MAX_MESSAGE_LENGTH = 1000;

type RouteContext = { params: Promise<{ reminderId: string }> };

function isNotFoundError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: unknown }).code === 'P2025'
  );
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getAuthenticatedUserId(_request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reminderId } = await params;
  try {
    const reminder = await getReminderById(reminderId);
    if (!reminder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ reminder });
  } catch (e) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (isReminderError(e)) {
      return NextResponse.json(
        { error: errorMessage(e, 'Invalid request') },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reminderId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawMessage = (body as { messageBody?: unknown }).messageBody;

  if (rawMessage === undefined) {
    return NextResponse.json(
      { error: 'messageBody is required' },
      { status: 400 },
    );
  }

  if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
    return NextResponse.json(
      { error: 'Please write a message before sending.' },
      { status: 400 },
    );
  }

  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: 'Your message is too long. Please keep it under 1000 characters.',
      },
      { status: 400 },
    );
  }

  try {
    const reminder = await updateReminder(reminderId, {
      messageBody: rawMessage,
    });
    if (!reminder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ reminder });
  } catch (e) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (isReminderError(e)) {
      return NextResponse.json(
        { error: errorMessage(e, 'Invalid request') },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}