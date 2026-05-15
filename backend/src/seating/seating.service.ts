import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ceremonyFilter } from '../common/utils/ceremony.utils';

@Injectable()
export class SeatingService {
  constructor(private prisma: PrismaService) {}

  list(user: any, ceremonyId?: string) {
    const filter = ceremonyId ? { ceremonyId } : ceremonyFilter(user);
    return this.prisma.table.findMany({
      where: filter,
      include: { guests: { select: { id:true, firstName:true, lastName:true } } },
      orderBy: { number: 'asc' },
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
    const table = tableId ? await this.prisma.table.findUnique({ where: { id: tableId } }) : null;
    return this.prisma.guest.update({
      where: { id: guestId },
      data: { tableId: tableId || null, tableNumber: table?.number || null },
    });
  }
}
