import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@wedding.local' } });
  if (adminExists) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const vinHonneur = await prisma.ceremony.upsert({
    where: { type: 'VIN_HONNEUR' },
    update: {},
    create: {
      name: "Vin d'honneur",
      type: 'VIN_HONNEUR',
      description: 'Cocktail de mariage',
      date: new Date('2026-07-04T16:00:00Z'),
      location: 'Domaine des Roses',
    },
  });

  const diner = await prisma.ceremony.upsert({
    where: { type: 'DINER' },
    update: {},
    create: {
      name: 'Dîner de mariage',
      type: 'DINER',
      description: 'Dîner de réception',
      date: new Date('2026-07-04T19:30:00Z'),
      location: 'Domaine des Roses — Salle de réception',
    },
  });

  const brandingCount = await prisma.appBranding.count();
  if (brandingCount === 0) {
    await prisma.appBranding.create({ data: { appName: 'Wedding Access', activeThemeMode: 'light' } });
  }

  const hash = await bcrypt.hash('Admin1234!', 12);

  await prisma.user.createMany({
    data: [
      { email: 'admin@wedding.local', passwordHash: hash, firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', ceremonyScope: null },
      { email: 'vin@wedding.local', passwordHash: hash, firstName: 'Admin', lastName: "Vin d'honneur", role: 'ADMIN_VIN_HONNEUR', ceremonyScope: 'VIN_HONNEUR' },
      { email: 'diner@wedding.local', passwordHash: hash, firstName: 'Agent', lastName: 'Dîner', role: 'AGENT_DINER', ceremonyScope: 'DINER' },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete');
  console.log('  admin@wedding.local / Admin1234!');
  console.log('  vin@wedding.local   / Admin1234!');
  console.log('  diner@wedding.local / Admin1234!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
