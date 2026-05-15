import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const vinHonneur = await prisma.ceremony.upsert({
    where: { id: 'ceremony-vin-honneur' },
    update: {},
    create: {
      id: 'ceremony-vin-honneur',
      name: 'Vin d\'honneur',
      type: 'VIN_HONNEUR',
      date: new Date('2026-07-04T16:00:00Z'),
      venue: 'Domaine des Roses',
    },
  });

  const diner = await prisma.ceremony.upsert({
    where: { id: 'ceremony-diner' },
    update: {},
    create: {
      id: 'ceremony-diner',
      name: 'Dîner de mariage',
      type: 'DINER',
      date: new Date('2026-07-04T19:30:00Z'),
      venue: 'Domaine des Roses — Salle de réception',
    },
  });

  await prisma.branding.upsert({
    where: { ceremonyId: vinHonneur.id },
    update: {},
    create: {
      ceremonyId: vinHonneur.id,
      coupleName: 'M & J',
      eventDate: new Date('2026-07-04'),
      primaryColor: '#C9A84C',
    },
  });

  await prisma.branding.upsert({
    where: { ceremonyId: diner.id },
    update: {},
    create: {
      ceremonyId: diner.id,
      coupleName: 'M & J',
      eventDate: new Date('2026-07-04'),
      primaryColor: '#C9A84C',
    },
  });

  const hash = await bcrypt.hash('Admin1234!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@wedding.local' },
    update: {},
    create: {
      email: 'admin@wedding.local',
      passwordHash: hash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'vin@wedding.local' },
    update: {},
    create: {
      email: 'vin@wedding.local',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'Vin d\'honneur',
      role: 'ADMIN_VIN_HONNEUR',
      ceremonyId: vinHonneur.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'diner@wedding.local' },
    update: {},
    create: {
      email: 'diner@wedding.local',
      passwordHash: hash,
      firstName: 'Agent',
      lastName: 'Dîner',
      role: 'AGENT_DINER',
      ceremonyId: diner.id,
    },
  });

  console.log('✓ Seed complete');
  console.log('  admin@wedding.local / Admin1234!');
  console.log('  vin@wedding.local   / Admin1234!');
  console.log('  diner@wedding.local / Admin1234!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
