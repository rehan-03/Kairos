import { NextResponse } from 'next/server';
import { isReminderError, sendReminder } from '@/modules/reminders';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reminderId: string }> },
) {
  const reminderId = (await params).reminderId;

  if (!reminderId) {
    return NextResponse.json({ error: 'Reminder id is required' }, { status: 400 });
  }

  try {
    const result = await sendReminder(reminderId, {});
    return NextResponse.json(result);
  } catch (error) {
    if (isReminderError(error)) {
      const message = error instanceof Error ? error.message : 'Cannot send reminder';
      const notFound = /not found/i.test(message);
      return NextResponse.json({ error: message }, { status: notFound ? 404 : 409 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}