import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || './storage';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  private withUrls(b: any) {
    const { monogramData, monogramMime, logoData, logoMime, ...rest } = b;
    return {
      ...rest,
      monogramUrl: monogramData
        ? `data:${monogramMime || 'image/png'};base64,${monogramData}`
        : null,
      logoUrl: logoData
        ? `data:${logoMime || 'image/png'};base64,${logoData}`
        : null,
    };
  }

  async get() {
    let branding = await this.prisma.appBranding.findFirst();
    if (!branding) {
      branding = await this.prisma.appBranding.create({
        data: { appName: 'Wedding Access' },
      });
    }
    return this.withUrls(branding);
  }

  async getRaw() {
    let branding = await this.prisma.appBranding.findFirst();
    if (!branding) {
      branding = await this.prisma.appBranding.create({
        data: { appName: 'Wedding Access' },
      });
    }
    return branding;
  }

  async update(dto: { appName?: string; activeThemeMode?: string }, userId: string) {
    const branding = await this.getRaw();
    const data: any = { updatedByUserId: userId };
    if (dto.appName !== undefined) data.appName = dto.appName;
    if (dto.activeThemeMode !== undefined) data.activeThemeMode = dto.activeThemeMode;
    const updated = await this.prisma.appBranding.update({ where: { id: branding.id }, data });
    return this.withUrls(updated);
  }

  async uploadMonogram(file: Express.Multer.File, userId: string) {
    const branding = await this.getRaw();
    const base64 = file.buffer.toString('base64');
    const mime = file.mimetype || 'image/png';

    // Best-effort write to disk (for PDF generation; not critical if it fails)
    let filePath: string | null = null;
    try {
      const dir = path.join(STORAGE, 'branding');
      fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(file.originalname) || '.png';
      const fileName = `monogram-${Date.now()}${ext}`;
      filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      if (branding.monogramPath && fs.existsSync(branding.monogramPath)) {
        try { fs.unlinkSync(branding.monogramPath); } catch {}
      }
    } catch {}

    const updated = await this.prisma.appBranding.update({
      where: { id: branding.id },
      data: {
        monogramData: base64,
        monogramMime: mime,
        monogramPath: filePath ?? branding.monogramPath,
        updatedByUserId: userId,
      },
    });
    return this.withUrls(updated);
  }

  async deleteMonogram(userId: string) {
    const branding = await this.getRaw();
    if (branding.monogramPath && fs.existsSync(branding.monogramPath)) {
      try { fs.unlinkSync(branding.monogramPath); } catch {}
    }
    const updated = await this.prisma.appBranding.update({
      where: { id: branding.id },
      data: { monogramPath: null, monogramData: null, monogramMime: null, updatedByUserId: userId },
    });
    return this.withUrls(updated);
  }

  async uploadLogo(file: Express.Multer.File, userId: string) {
    const branding = await this.getRaw();
    const base64 = file.buffer.toString('base64');
    const mime = file.mimetype || 'image/png';

    let filePath: string | null = null;
    try {
      const dir = path.join(STORAGE, 'branding');
      fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(file.originalname) || '.png';
      const fileName = `logo-${Date.now()}${ext}`;
      filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      if (branding.primaryLogoPath && fs.existsSync(branding.primaryLogoPath)) {
        try { fs.unlinkSync(branding.primaryLogoPath); } catch {}
      }
    } catch {}

    const updated = await this.prisma.appBranding.update({
      where: { id: branding.id },
      data: {
        logoData: base64,
        logoMime: mime,
        primaryLogoPath: filePath ?? branding.primaryLogoPath,
        updatedByUserId: userId,
      },
    });
    return this.withUrls(updated);
  }

  async deleteLogo(userId: string) {
    const branding = await this.getRaw();
    if (branding.primaryLogoPath && fs.existsSync(branding.primaryLogoPath)) {
      try { fs.unlinkSync(branding.primaryLogoPath); } catch {}
    }
    const updated = await this.prisma.appBranding.update({
      where: { id: branding.id },
      data: { primaryLogoPath: null, logoData: null, logoMime: null, updatedByUserId: userId },
    });
    return this.withUrls(updated);
  }
}
