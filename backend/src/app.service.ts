import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seed();
    } catch (e) {
      this.logger.error('Seed error: ' + e.message);
    }
  }

  private async seed() {
    const adminExists = await this.prisma.user.findUnique({ where: { email: 'admin@wedding.local' } });
    if (adminExists) return;

    this.logger.log('Seeding database...');

    const vinHonneur = await this.prisma.ceremony.upsert({
      where: { id: 'ceremony-vin-honneur' },
      update: {},
      create: { id: 'ceremony-vin-honneur', name: "Vin d'honneur", type: 'VIN_HONNEUR', date: new Date('2026-07-04T16:00:00Z'), venue: 'Domaine des Roses' },
    });

    const diner = await this.prisma.ceremony.upsert({
      where: { id: 'ceremony-diner' },
      update: {},
      create: { id: 'ceremony-diner', name: 'Dîner de mariage', type: 'DINER', date: new Date('2026-07-04T19:30:00Z'), venue: 'Domaine des Roses — Salle de réception' },
    });

    await this.prisma.branding.upsert({
      where: { ceremonyId: vinHonneur.id },
      update: {},
      create: { ceremonyId: vinHonneur.id, coupleName: 'M & J', eventDate: new Date('2026-07-04'), primaryColor: '#C9A84C' },
    });

    await this.prisma.branding.upsert({
      where: { ceremonyId: diner.id },
      update: {},
      create: { ceremonyId: diner.id, coupleName: 'M & J', eventDate: new Date('2026-07-04'), primaryColor: '#C9A84C' },
    });

    const hash = await bcrypt.hash('Admin1234!', 12);

    await this.prisma.user.createMany({
      data: [
        { email: 'admin@wedding.local', passwordHash: hash, firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN' },
        { email: 'vin@wedding.local', passwordHash: hash, firstName: 'Admin', lastName: "Vin d'honneur", role: 'ADMIN_VIN_HONNEUR', ceremonyId: vinHonneur.id },
        { email: 'diner@wedding.local', passwordHash: hash, firstName: 'Agent', lastName: 'Dîner', role: 'AGENT_DINER', ceremonyId: diner.id },
      ],
      skipDuplicates: true,
    });

    this.logger.log('✓ Seed complete — admin@wedding.local / Admin1234!');
  }
}
