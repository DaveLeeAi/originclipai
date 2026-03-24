import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const userId = process.env.DEV_USER_ID;
  if (!userId) {
    console.error('Set DEV_USER_ID to your Supabase auth.users UUID');
    process.exit(1);
  }

  await prisma.profile.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: process.env.DEV_USER_EMAIL ?? 'dev@example.com',
      plan: 'pro',
      minutesLimit: 900,
    },
    update: {},
  });

  console.log(`Dev profile ready for user ${userId}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); process.exit(1); });
