import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async live(ceremonyId?: string) {
    const where = ceremonyId ? { ceremonyId } : {};
    const [total, arrived, absent, confirmed, scansToday] = await Promise.all([
      this.prisma.guest.count({ where }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'ARRIVED' } }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'ABSENT' } }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'CONFIRMED' } }),
      this.prisma.scan.count({
        where: {
          ...(ceremonyId ? { ceremonyId } : {}),
          scannedAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
          result: 'OK',
        },
      }),
    ]);
    return { total, arrived, absent, confirmed, pending: total - arrived - absent, scansToday, timestamp: new Date() };
  }
}
