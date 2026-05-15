import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  async get(ceremonyId: string) {
    const b = await this.prisma.branding.findUnique({ where: { ceremonyId } });
    if (!b) throw new NotFoundException('Branding introuvable');
    return b;
  }

  async update(ceremonyId: string, dto: any) {
    return this.prisma.branding.upsert({
      where: { ceremonyId },
      update: dto,
      create: { ceremonyId, ...dto },
    });
  }
}
