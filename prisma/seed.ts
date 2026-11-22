// Demo data CLI. The rows live in src/lib/demo-seed.ts so the settings reset can reuse them.
// Each table is only filled when empty; safe to run again.
import { PrismaClient } from '@prisma/client';
import { seedDemoData } from '../src/lib/demo-seed';

const db = new PrismaClient();

async function main() {
  await seedDemoData(db); // upserts the demo user (demo@example.com) along with the rest of the demo data
  const demoUser = await db.user.findFirst({ where: { email: 'demo@example.com' }, select: { email: true } });
  console.log(demoUser ? '[seed] demo-user: OK' : '[seed] demo-user: MISSING');
  console.log('[seed] demo data ready');
}

main()
  .then(async () => { await db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(0); });
