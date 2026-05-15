import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CeremoniesService {
  constructor(private prisma: PrismaService) {}

  list(user: any) {
    const where =
      user.role === 'SUPER_ADMIN'
        ? {}
        : user.ceremonyScope
          ? { type: user.ceremonyScope as any }
          : { id: '__none__' };

    return this.prisma.ceremony.findMany({ where, orderBy: { date: 'asc' } });
  }

  async get(id: string) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    return ceremony;
  }

  create(dto: any) {
    return this.prisma.ceremony.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.ceremony.update({ where: { id }, data: dto });
  }
}
