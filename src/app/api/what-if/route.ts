import { NextResponse } from 'next/server';
import { isWhatIfValidationError, runWhatIf } from '@/modules/what-if';

export const dynamic = 'force-dynamic';

const HORIZONS = ['30', '60', '90'] as const;
const CHANGES = ['pays_late', 'does_not_pay'] as const;
const PRESETS = ['five_latest_payers_15_days_late'] as const;

type Horizon = (typeof HORIZONS)[number];
type Change = (typeof CHANGES)[number];
type Preset = (typeof PRESETS)[number];

function isHorizon(value: string): value is Horizon {
  return (HORIZONS as readonly string[]).includes(value);
}

function isChange(value: string): value is Change {
  return (CHANGES as readonly string[]).includes(value);
}

function isPreset(value: string): value is Preset {
  return (PRESETS as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const horizonParam = searchParams.get('horizon') ?? '30';
  if (!isHorizon(horizonParam)) {
    return NextResponse.json(
      { error: 'Horizon must be 30, 60 or 90.' },
      { status: 400 },
    );
  }

  const presetParam = searchParams.get('preset');
  let preset: Preset | undefined;
  if (presetParam !== null) {
    if (!isPreset(presetParam)) {
      return NextResponse.json({ error: 'Unknown preset.' }, { status: 400 });
    }
    preset = presetParam;
  }

  const changeParam = searchParams.get('change');
  let change: Change | undefined;
  if (changeParam !== null) {
    if (!isChange(changeParam)) {
      return NextResponse.json(
        { error: 'Choose a scenario: pays later or does not pay this month.' },
        { status: 400 },
      );
    }
    change = changeParam;
  }

  const daysParam = searchParams.get('days');
  let days: number | undefined;
  if (daysParam !== null && daysParam !== '') {
    const parsed = Number(daysParam);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json(
        { error: 'Enter a whole number of days between 1 and 90.' },
        { status: 400 },
      );
    }
    days = parsed;
  }

  const customerIds = searchParams.get('customer_ids') ?? undefined;

  try {
    const whatIf = await runWhatIf({
      horizon: horizonParam,
      change,
      days,
      customer_ids: customerIds,
      preset,
    });

    return NextResponse.json({ whatIf });
  } catch (error) {
    if (isWhatIfValidationError(error)) {
      const message =
        error instanceof Error ? error.message : 'Invalid what-if request.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}