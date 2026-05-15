import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || './storage';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  async get() {
    let branding = await this.prisma.appBranding.findFirst();
    if (!branding) {
      branding = await this.prisma.appBranding.create({
        data: { appName: 'Wedding Access' },
      });
    }
    return branding;
  }

  async update(dto: { appName?: string; activeThemeMode?: string }, userId: string) {
    const branding = await this.get();
    const data: any = { updatedByUserId: userId };
    if (dto.appName !== undefined) data.appName = dto.appName;
    if (dto.activeThemeMode !== undefined) data.activeThemeMode = dto.activeThemeMode;
    return this.prisma.appBranding.update({ where: { id: branding.id }, data });
  }

  async uploadMonogram(file: Express.Multer.File, userId: string) {
    const branding = await this.get();
    const dir = path.join(STORAGE, 'branding');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '.png';
    const fileName = `monogram-${Date.now()}${ext}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Remove old file
    if (branding.monogramPath && fs.existsSync(branding.monogramPath)) {
      fs.unlinkSync(branding.monogramPath);
    }

    return this.prisma.appBranding.update({
      where: { id: branding.id },
      data: { monogramPath: filePath, updatedByUserId: userId },
    });
  }

  async deleteMonogram(userId: string) {
    const branding = await this.get();
    if (branding.monogramPath && fs.existsSync(branding.monogramPath)) {
      fs.unlinkSync(branding.monogramPath);
    }
    return this.prisma.appBranding.update({
      where: { id: branding.id },
      data: { monogramPath: null, updatedByUserId: userId },
    });
  }

  async uploadLogo(file: Express.Multer.File, userId: string) {
    const branding = await this.get();
    const dir = path.join(STORAGE, 'branding');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '.png';
    const fileName = `logo-${Date.now()}${ext}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Remove old file
    if (branding.primaryLogoPath && fs.existsSync(branding.primaryLogoPath)) {
      fs.unlinkSync(branding.primaryLogoPath);
    }

    return this.prisma.appBranding.update({
      where: { id: branding.id },
      data: { primaryLogoPath: filePath, updatedByUserId: userId },
    });
  }

  async deleteLogo(userId: string) {
    const branding = await this.get();
    if (branding.primaryLogoPath && fs.existsSync(branding.primaryLogoPath)) {
      fs.unlinkSync(branding.primaryLogoPath);
    }
    return this.prisma.appBranding.update({
      where: { id: branding.id },
      data: { primaryLogoPath: null, updatedByUserId: userId },
    });
  }
}
