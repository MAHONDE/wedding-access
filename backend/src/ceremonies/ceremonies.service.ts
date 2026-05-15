import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ceremonyFilter } from '../common/utils/ceremony.utils';

@Injectable()
export class CeremoniesService {
  constructor(private prisma: PrismaService) {}

  list(user: any) {
    const filter = ceremonyFilter(user);
    return this.prisma.ceremony.findMany({
      where: filter.ceremonyId ? { id: filter.ceremonyId } : {},
      include: { branding: true },
    });
  }

  get(id: string) {
    return this.prisma.ceremony.findUnique({ where: { id }, include: { branding: true } });
  }

  create(dto: any) {
    return this.prisma.ceremony.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.ceremony.update({ where: { id }, data: dto });
  }
}
