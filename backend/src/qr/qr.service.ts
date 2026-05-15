import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || '/app/storage';

@Injectable()
export class QrService {
  constructor(private prisma: PrismaService) {}

  private buildToken(guest: any): string {
    const ceremony = guest.ceremony?.type === 'VIN_HONNEUR' ? 'V' : 'D';
    const seq = guest.id.slice(-4).toUpperCase();
    const year = new Date().getFullYear();
    const raw = `WA-${ceremony}-${seq}-${year}`;
    const sig = crypto
      .createHmac('sha256', process.env.QR_SECRET || 'wedding-qr-secret')
      .update(raw)
      .digest('hex')
      .slice(0, 12);
    return `${raw}.${sig}`;
  }

  async generate(guestId: string, force = false): Promise<string> {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { ceremony: true },
    });
    if (!guest) throw new NotFoundException('Invité introuvable');

    if (guest.qrToken && !force) return guest.qrToken;

    const token = this.buildToken(guest);
    const dir = path.join(STORAGE, 'qrcodes');
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${guestId}.png`);
    await QRCode.toFile(filePath, token, { width: 300, margin: 2 });

    await this.prisma.guest.update({
      where: { id: guestId },
      data: { qrToken: token, qrCodePath: filePath },
    });

    return token;
  }

  async regenerate(guestId: string): Promise<string> {
    return this.generate(guestId, true);
  }
}
