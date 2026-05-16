import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  private scopeWhere(user: any, ceremonyId?: string): any {
    const base: any = {};
    if (ceremonyId) {
      base.ceremonyId = ceremonyId;
    } else if (user.role !== 'SUPER_ADMIN' && user.ceremonyScope) {
      base.ceremony = { type: user.ceremonyScope };
    }
    return base;
  }

  private assertScope(user: any, guest: { ceremony: { type: string } }) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.ceremonyScope !== guest.ceremony.type) {
      throw new ForbiddenException('Accès à cet invité non autorisé');
    }
  }

  async list(user: any, ceremonyId?: string, q?: string) {
    const where: any = { ...this.scopeWhere(user, ceremonyId) };

    if (q) {
      where.OR = [
        { primaryName: { contains: q, mode: 'insensitive' } },
        { companionName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.guest.findMany({
      where,
      include: {
        ceremony: { select: { id: true, name: true, type: true } },
        table: { select: { id: true, name: true } },
      },
      orderBy: { primaryName: 'asc' },
    });
  }

  async stats(user: any, ceremonyId?: string) {
    const where: any = this.scopeWhere(user, ceremonyId);

    const [total, totalIndividual, totalCouple, arrived] = await Promise.all([
      this.prisma.guest.count({ where }),
      this.prisma.guest.count({ where: { ...where, type: 'INDIVIDUAL' } }),
      this.prisma.guest.count({ where: { ...where, type: 'COUPLE' } }),
      this.prisma.guest.count({ where: { ...where, entryStatus: 'ARRIVED' } }),
    ]);

    const seatsAggregate = await this.prisma.guest.aggregate({
      where,
      _sum: { numberOfSeats: true },
    });

    const totalSeats = seatsAggregate._sum.numberOfSeats ?? 0;

    return {
      total,
      totalIndividual,
      totalCouple,
      totalSeats,
      arrived,
      notArrived: total - arrived,
    };
  }

  async get(user: any, id: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: {
        ceremony: { select: { id: true, name: true, type: true } },
        table: { select: { id: true, name: true } },
      },
    });
    if (!guest) throw new NotFoundException('Invité introuvable');
    this.assertScope(user, guest);
    return guest;
  }

  async create(user: any, dto: any) {
    const { ceremonyId, type, primaryName, companionName, email, phone, tableId } = dto;

    if (!ceremonyId) throw new BadRequestException('ceremonyId est requis');
    if (!primaryName) throw new BadRequestException('primaryName est requis');

    // Check scope: non-super-admin can only create for their ceremony
    if (user.role !== 'SUPER_ADMIN') {
      const ceremony = await this.prisma.ceremony.findUnique({
        where: { id: ceremonyId },
      });
      if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
      if (user.ceremonyScope && user.ceremonyScope !== ceremony.type) {
        throw new ForbiddenException(
          'Vous ne pouvez créer des invités que pour votre cérémonie',
        );
      }
    }

    const guestType = type || 'INDIVIDUAL';
    let numberOfSeats = 1;

    if (guestType === 'COUPLE') {
      if (!companionName) {
        throw new BadRequestException(
          'companionName est requis pour un invité de type COUPLE',
        );
      }
      numberOfSeats = 2;
    }

    return this.prisma.guest.create({
      data: {
        ceremonyId,
        type: guestType,
        primaryName,
        companionName: guestType === 'COUPLE' ? companionName : null,
        email: email || null,
        phone: phone || null,
        numberOfSeats,
        tableId: tableId || null,
        entryStatus: 'NOT_ARRIVED',
      },
      include: {
        ceremony: { select: { id: true, name: true, type: true } },
        table: { select: { id: true, name: true } },
      },
    });
  }

  async update(user: any, id: string, dto: any) {
    const guest = await this.get(user, id);

    const data: any = {};
    if (dto.primaryName !== undefined) data.primaryName = dto.primaryName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.tableId !== undefined) data.tableId = dto.tableId;
    if (dto.entryStatus !== undefined) data.entryStatus = dto.entryStatus;

    if (dto.type !== undefined) {
      data.type = dto.type;
      if (dto.type === 'COUPLE') {
        data.numberOfSeats = 2;
        if (dto.companionName !== undefined) data.companionName = dto.companionName;
      } else {
        data.numberOfSeats = 1;
        data.companionName = null;
      }
    } else if (dto.companionName !== undefined) {
      data.companionName = dto.companionName;
    }

    return this.prisma.guest.update({
      where: { id },
      data,
      include: {
        ceremony: { select: { id: true, name: true, type: true } },
        table: { select: { id: true, name: true } },
      },
    });
  }

  async delete(user: any, id: string) {
    await this.get(user, id);
    return this.prisma.guest.delete({ where: { id } });
  }

  async import(user: any, ceremonyId: string, csv: string) {
    if (!ceremonyId) throw new BadRequestException('ceremonyId est requis');
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    if (user.role !== 'SUPER_ADMIN' && user.ceremonyScope && user.ceremonyScope !== ceremony.type) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const primaryName = parts[0];
      const companionName = parts[1] || null;
      const email = parts[2] || null;
      const phone = parts[3] || null;

      if (!primaryName) { results.skipped++; continue; }

      try {
        const type = companionName ? 'COUPLE' : 'INDIVIDUAL';
        await this.prisma.guest.create({
          data: {
            ceremonyId,
            type,
            primaryName,
            companionName: companionName || null,
            email: email || null,
            phone: phone || null,
            numberOfSeats: type === 'COUPLE' ? 2 : 1,
            entryStatus: 'NOT_ARRIVED',
          },
        });
        results.created++;
      } catch {
        results.errors.push(primaryName);
        results.skipped++;
      }
    }

    return results;
  }
}
