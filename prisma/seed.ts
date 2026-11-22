// Demo data CLI. The rows live in src/lib/demo-seed.ts so the settings reset can reuse them.
// Each table is only filled when empty; safe to run again.
import { PrismaClient } from '@prisma/client';
import { seedDemoData } from '../src/lib/demo-seed';

const db = new PrismaClient();

async function main() {
  console.log('[seed] demo-user: MISSING — this app has no user model');
  await seedDemoData(db);
  console.log('[seed] demo data ready');
}

main()
  .then(async () => { await db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(0); });
