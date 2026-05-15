import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ceremonyFilter, assertCeremonyAccess } from '../common/utils/ceremony.utils';

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async list(user: any, q?: string) {
    const filter = ceremonyFilter(user);
    return this.prisma.guest.findMany({
      where: {
        ...filter,
        ...(q ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { email:     { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async stats(user: any, ceremonyId?: string) {
    const where = ceremonyId ? { ceremonyId } : ceremonyFilter(user);
    const [total, arrived, absent, confirmed] = await Promise.all([
      this.prisma.guest.count({ where }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'ARRIVED' } }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'ABSENT' } }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'CONFIRMED' } }),
    ]);
    return { total, arrived, absent, confirmed, pending: total - arrived - absent };
  }

  async get(user: any, id: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id } });
    if (!guest) throw new NotFoundException();
    assertCeremonyAccess(user, guest.ceremonyId);
    return guest;
  }

  async create(user: any, dto: any) {
    if (dto.ceremonyId) assertCeremonyAccess(user, dto.ceremonyId);
    const filter = ceremonyFilter(user);
    return this.prisma.guest.create({
      data: { ...dto, ceremonyId: dto.ceremonyId || filter.ceremonyId },
    });
  }

  async update(user: any, id: string, dto: any) {
    const guest = await this.get(user, id);
    return this.prisma.guest.update({ where: { id }, data: dto });
  }

  async delete(user: any, id: string) {
    await this.get(user, id);
    return this.prisma.guest.delete({ where: { id } });
  }
}
