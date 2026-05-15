import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import * as QRCodeLib from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || './storage';

@Injectable()
export class QrService {
  constructor(private prisma: PrismaService) {}

  private buildToken(guestId: string, ceremonyId: string): string {
    const timestamp = Date.now().toString();
    const raw = `${guestId}:${ceremonyId}:${timestamp}`;
    const sig = crypto
      .createHmac('sha256', process.env.QR_SECRET || 'wedding-qr-secret')
      .update(raw)
      .digest('hex');
    return `${sig}`;
  }

  private assertUserScope(user: any, ceremonyType: string) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.ceremonyScope && user.ceremonyScope !== ceremonyType) {
      throw new ForbiddenException('Accès à cette cérémonie non autorisé');
    }
  }

  async generate(user: any, guestId: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { ceremony: true },
    });
    if (!guest) throw new NotFoundException('Invité introuvable');
    this.assertUserScope(user, guest.ceremony.type);

    // Disable existing active QR codes for this guest
    await this.prisma.qRCode.updateMany({
      where: { guestId, isActive: true },
      data: { isActive: false },
    });

    const token = this.buildToken(guestId, guest.ceremonyId);
    const dir = path.join(STORAGE, 'qrcodes');
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${token}.png`);
    await QRCodeLib.toFile(filePath, token, { width: 300, margin: 2 });

    const qrCode = await this.prisma.qRCode.create({
      data: {
        guestId,
        ceremonyId: guest.ceremonyId,
        token,
        qrImagePath: filePath,
        isActive: true,
      },
    });

    return qrCode;
  }

  async regenerate(user: any, id: string) {
    const existing = await this.prisma.qRCode.findUnique({
      where: { id },
      include: { guest: { include: { ceremony: true } } },
    });
    if (!existing) throw new NotFoundException('QR code introuvable');
    this.assertUserScope(user, existing.guest.ceremony.type);

    // Disable the old one
    await this.prisma.qRCode.update({
      where: { id },
      data: { isActive: false },
    });

    // Disable all other active QR codes for this guest too
    await this.prisma.qRCode.updateMany({
      where: { guestId: existing.guestId, isActive: true },
      data: { isActive: false },
    });

    const token = this.buildToken(existing.guestId, existing.ceremonyId);
    const dir = path.join(STORAGE, 'qrcodes');
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${token}.png`);
    await QRCodeLib.toFile(filePath, token, { width: 300, margin: 2 });

    return this.prisma.qRCode.create({
      data: {
        guestId: existing.guestId,
        ceremonyId: existing.ceremonyId,
        token,
        qrImagePath: filePath,
        isActive: true,
      },
    });
  }

  async disable(user: any, id: string) {
    const existing = await this.prisma.qRCode.findUnique({
      where: { id },
      include: { guest: { include: { ceremony: true } } },
    });
    if (!existing) throw new NotFoundException('QR code introuvable');
    this.assertUserScope(user, existing.guest.ceremony.type);

    return this.prisma.qRCode.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getActive(guestId: string) {
    return this.prisma.qRCode.findFirst({
      where: { guestId, isActive: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async ensureActiveForGuest(user: any, guestId: string) {
    const active = await this.getActive(guestId);
    if (active) return active;
    return this.generate(user, guestId);
  }
}
