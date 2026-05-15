import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import { assertCeremonyAccess } from '../common/utils/ceremony.utils';

@Injectable()
export class ScansService {
  constructor(private prisma: PrismaService) {}

  private validateToken(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [raw, sig] = parts;
    const expected = crypto
      .createHmac('sha256', process.env.QR_SECRET || 'wedding-qr-secret')
      .update(raw)
      .digest('hex')
      .slice(0, 12);
    return expected === sig;
  }

  async verify(user: any, token: string) {
    if (!this.validateToken(token)) {
      await this.logScan(user, token, null, 'INVALID_TOKEN');
      return { valid: false, result: 'INVALID_TOKEN', message: 'QR code invalide ou falsifié' };
    }

    const guest = await this.prisma.guest.findUnique({
      where: { qrToken: token },
      include: { ceremony: true },
    });

    if (!guest) {
      await this.logScan(user, token, null, 'INVALID_TOKEN');
      return { valid: false, result: 'INVALID_TOKEN', message: 'Invité introuvable' };
    }

    if (user.role !== 'SUPER_ADMIN' && user.ceremonyId !== guest.ceremonyId) {
      await this.logScan(user, token, guest.id, 'WRONG_CEREMONY');
      return { valid: false, result: 'WRONG_CEREMONY', message: 'Cérémonie incorrecte' };
    }

    if (guest.entryStatus === 'ARRIVED') {
      await this.logScan(user, token, guest.id, 'ALREADY_SCANNED');
      return { valid: false, result: 'ALREADY_SCANNED', message: 'Invité déjà enregistré', guest };
    }

    return { valid: true, result: 'OK', guest };
  }

  async markEntry(user: any, token: string) {
    const verification = await this.verify(user, token);
    if (!verification.valid) {
      return verification;
    }

    const guest = await this.prisma.guest.update({
      where: { qrToken: token },
      data: { entryStatus: 'ARRIVED' },
    });

    await this.logScan(user, token, guest.id, 'OK');
    return { valid: true, result: 'OK', guest };
  }

  private async logScan(user: any, token: string, guestId: string | null, result: string) {
    const guest = guestId ? await this.prisma.guest.findUnique({ where: { id: guestId } }) : null;
    if (!guest && !user.ceremonyId) return;
    await this.prisma.scan.create({
      data: {
        token,
        result: result as any,
        ceremonyId: guest?.ceremonyId || user.ceremonyId,
        guestId: guestId || undefined,
        scannedById: user.sub || user.id,
      },
    }).catch(() => {});
  }

  async history(user: any, ceremonyId: string | undefined, page = 1) {
    const take = 50;
    const skip = (page - 1) * take;
    const where = ceremonyId
      ? { ceremonyId }
      : user.role === 'SUPER_ADMIN' ? {} : { ceremonyId: user.ceremonyId };

    const [data, total] = await Promise.all([
      this.prisma.scan.findMany({
        where,
        orderBy: { scannedAt: 'desc' },
        skip,
        take,
        include: { guest: true, scannedBy: { select: { email: true } } },
      }),
      this.prisma.scan.count({ where }),
    ]);

    return { data, total, page, pages: Math.ceil(total / take) };
  }
}
