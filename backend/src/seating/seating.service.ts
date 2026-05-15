/**
 * @deprecated Use SeatingPlansModule instead.
 * This file is kept for reference but not registered in AppModule.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SeatingService {
  constructor(private prisma: PrismaService) {}

  list(user: any, ceremonyId?: string) {
    const where: any = ceremonyId ? { ceremonyId } : {};
    return this.prisma.table.findMany({
      where,
      include: { guests: { select: { id: true, primaryName: true } } },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: any) {
    return this.prisma.table.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.table.delete({ where: { id } });
  }

  async assign(guestId: string, tableId: string | null) {
    return this.prisma.guest.update({
      where: { id: guestId },
      data: { tableId: tableId || null },
    });
  }
}
