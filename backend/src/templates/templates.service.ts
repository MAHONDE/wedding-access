import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || './storage';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  private assertScope(user: any, ceremonyType: string) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.ceremonyScope && user.ceremonyScope !== ceremonyType) {
      throw new ForbiddenException('Accès à cette cérémonie non autorisé');
    }
  }

  async upload(user: any, ceremonyId: string, file: Express.Multer.File, name?: string) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    this.assertScope(user, ceremony.type);

    const dir = path.join(STORAGE, 'templates');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '.pdf';
    const fileName = `${ceremonyId}-${Date.now()}${ext}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Deactivate old templates for this ceremony
    await this.prisma.template.updateMany({
      where: { ceremonyId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.template.create({
      data: {
        ceremonyId,
        name: name || file.originalname,
        filePath,
        isActive: true,
      },
    });
  }

  async getActive(user: any, ceremonyId: string) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    this.assertScope(user, ceremony.type);

    const template = await this.prisma.template.findFirst({
      where: { ceremonyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) throw new NotFoundException('Aucun template actif pour cette cérémonie');
    return template;
  }

  async update(user: any, ceremonyId: string, dto: any) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    this.assertScope(user, ceremony.type);

    const template = await this.prisma.template.findFirst({
      where: { ceremonyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) throw new NotFoundException('Aucun template actif');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.placeholders !== undefined) data.placeholders = dto.placeholders;

    return this.prisma.template.update({ where: { id: template.id }, data });
  }

  async setQrZone(user: any, ceremonyId: string, config: { x: number; y: number; width: number; height: number }) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    this.assertScope(user, ceremony.type);

    const template = await this.prisma.template.findFirst({
      where: { ceremonyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) throw new NotFoundException('Aucun template actif');

    return this.prisma.template.update({
      where: { id: template.id },
      data: { qrZoneConfig: config },
    });
  }

  async deactivate(user: any, ceremonyId: string) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    this.assertScope(user, ceremony.type);

    await this.prisma.template.updateMany({
      where: { ceremonyId, isActive: true },
      data: { isActive: false },
    });

    return { message: 'Template désactivé' };
  }
}
