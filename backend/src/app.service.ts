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
    const adminExists = await this.prisma.user.findUnique({
      where: { email: 'admin@wedding.local' },
    });
    if (adminExists) return;

    this.logger.log('Seeding database...');

    // Create ceremonies
    const vinHonneur = await this.prisma.ceremony.upsert({
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

    const diner = await this.prisma.ceremony.upsert({
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

    // Create AppBranding (single global record)
    const brandingCount = await this.prisma.appBranding.count();
    if (brandingCount === 0) {
      await this.prisma.appBranding.create({
        data: {
          appName: 'Wedding Access',
          activeThemeMode: 'light',
        },
      });
    }

    // Create users
    const hash = await bcrypt.hash('Admin1234!', 12);

    await this.prisma.user.createMany({
      data: [
        {
          email: 'admin@wedding.local',
          passwordHash: hash,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          ceremonyScope: null,
        },
        {
          email: 'vin@wedding.local',
          passwordHash: hash,
          firstName: 'Admin',
          lastName: "Vin d'honneur",
          role: 'ADMIN_VIN_HONNEUR',
          ceremonyScope: 'VIN_HONNEUR',
        },
        {
          email: 'diner@wedding.local',
          passwordHash: hash,
          firstName: 'Agent',
          lastName: 'Dîner',
          role: 'AGENT_DINER',
          ceremonyScope: 'DINER',
        },
      ],
      skipDuplicates: true,
    });

    // Create sample tables for each ceremony
    const [tableVin1, tableVin2] = await Promise.all([
      this.prisma.table.create({
        data: {
          ceremonyId: vinHonneur.id,
          name: 'Table Honneur',
          numberOfChairs: 12,
          shape: 'ROUND',
          positionX: 200,
          positionY: 150,
        },
      }),
      this.prisma.table.create({
        data: {
          ceremonyId: vinHonneur.id,
          name: 'Table Famille',
          numberOfChairs: 8,
          shape: 'ROUND',
          positionX: 400,
          positionY: 150,
        },
      }),
    ]);

    const [tableDiner1, tableDiner2] = await Promise.all([
      this.prisma.table.create({
        data: {
          ceremonyId: diner.id,
          name: 'Table 1 — Mariés',
          numberOfChairs: 10,
          shape: 'RECTANGULAR',
          positionX: 300,
          positionY: 100,
        },
      }),
      this.prisma.table.create({
        data: {
          ceremonyId: diner.id,
          name: 'Table 2 — Famille',
          numberOfChairs: 10,
          shape: 'ROUND',
          positionX: 200,
          positionY: 300,
        },
      }),
    ]);

    // Create sample guests
    await this.prisma.guest.createMany({
      data: [
        {
          ceremonyId: vinHonneur.id,
          type: 'INDIVIDUAL',
          primaryName: 'Jean Martin',
          email: 'jean.martin@example.com',
          phone: '+33612345678',
          numberOfSeats: 1,
          tableId: tableVin1.id,
          entryStatus: 'NOT_ARRIVED',
        },
        {
          ceremonyId: vinHonneur.id,
          type: 'COUPLE',
          primaryName: 'Marie Dupont',
          companionName: 'Pierre Dupont',
          email: 'marie.dupont@example.com',
          phone: '+33698765432',
          numberOfSeats: 2,
          tableId: tableVin1.id,
          entryStatus: 'NOT_ARRIVED',
        },
        {
          ceremonyId: diner.id,
          type: 'INDIVIDUAL',
          primaryName: 'Sophie Bernard',
          email: 'sophie.bernard@example.com',
          numberOfSeats: 1,
          tableId: tableDiner1.id,
          entryStatus: 'NOT_ARRIVED',
        },
        {
          ceremonyId: diner.id,
          type: 'COUPLE',
          primaryName: 'Lucas Moreau',
          companionName: 'Emma Moreau',
          email: 'lucas.moreau@example.com',
          numberOfSeats: 2,
          tableId: tableDiner2.id,
          entryStatus: 'NOT_ARRIVED',
        },
      ],
      skipDuplicates: true,
    });

    this.logger.log('Seed complete — admin@wedding.local / Admin1234!');
  }
}
