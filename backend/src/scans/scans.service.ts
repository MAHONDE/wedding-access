import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StatsGateway } from '../stats/stats.gateway';

@Injectable()
export class ScansService {
  constructor(
    private prisma: PrismaService,
    private statsGateway: StatsGateway,
  ) {}

  async verify(user: any, token: string, deviceInfo?: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { token },
      include: {
        guest: {
          include: {
            ceremony: true,
            table: true,
          },
        },
      },
    });

    if (!qrCode) {
      await this.logScan(user, token, null, null, 'INVALID', deviceInfo);
      return {
        valid: false,
        result: 'INVALID',
        message: 'QR code introuvable ou invalide',
      };
    }

    if (!qrCode.isActive || qrCode.guest.deletedAt) {
      await this.logScan(user, token, qrCode.guest.id, qrCode.guest.ceremonyId, 'INVALID', deviceInfo);
      return {
        valid: false,
        result: 'INVALID',
        message: 'QR code désactivé',
      };
    }

    // Scope check
    if (
      user.role !== 'SUPER_ADMIN' &&
      user.ceremonyScope &&
      user.ceremonyScope !== qrCode.guest.ceremony.type
    ) {
      await this.logScan(user, token, qrCode.guest.id, qrCode.guest.ceremonyId, 'WRONG_CEREMONY', deviceInfo);
      return {
        valid: false,
        result: 'WRONG_CEREMONY',
        message: 'Ce QR code appartient à une autre cérémonie',
      };
    }

    if (qrCode.guest.entryStatus === 'ARRIVED') {
      await this.logScan(user, token, qrCode.guest.id, qrCode.guest.ceremonyId, 'ALREADY_USED', deviceInfo);
      return {
        valid: false,
        result: 'ALREADY_USED',
        message: 'Invité déjà enregistré',
        guest: this.formatGuest(qrCode.guest),
      };
    }

    return {
      valid: true,
      result: 'VALID',
      guest: this.formatGuest(qrCode.guest),
    };
  }

  async markEntry(user: any, token: string, deviceInfo?: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { token },
      include: {
        guest: {
          include: {
            ceremony: true,
            table: true,
          },
        },
      },
    });

    if (!qrCode) {
      await this.logScan(user, token, null, null, 'INVALID', deviceInfo);
      return { valid: false, result: 'INVALID', message: 'QR code introuvable ou invalide' };
    }

    if (!qrCode.isActive || qrCode.guest.deletedAt) {
      await this.logScan(user, token, qrCode.guest.id, qrCode.guest.ceremonyId, 'INVALID', deviceInfo);
      return { valid: false, result: 'INVALID', message: 'QR code désactivé' };
    }

    if (
      user.role !== 'SUPER_ADMIN' &&
      user.ceremonyScope &&
      user.ceremonyScope !== qrCode.guest.ceremony.type
    ) {
      await this.logScan(user, token, qrCode.guest.id, qrCode.guest.ceremonyId, 'WRONG_CEREMONY', deviceInfo);
      return { valid: false, result: 'WRONG_CEREMONY', message: 'Ce QR code appartient à une autre cérémonie' };
    }

    if (qrCode.guest.entryStatus === 'ARRIVED') {
      await this.logScan(user, token, qrCode.guest.id, qrCode.guest.ceremonyId, 'ALREADY_USED', deviceInfo);
      return {
        valid: false,
        result: 'ALREADY_USED',
        message: 'Invité déjà enregistré',
        guest: this.formatGuest(qrCode.guest),
      };
    }

    // Mark guest as arrived
    const updatedGuest = await this.prisma.guest.update({
      where: { id: qrCode.guest.id },
      data: { entryStatus: 'ARRIVED' },
      include: { ceremony: true, table: true },
    });

    // Update QR lastUsedAt
    await this.prisma.qRCode.update({
      where: { id: qrCode.id },
      data: { lastUsedAt: new Date() },
    });

    await this.logScan(user, token, updatedGuest.id, updatedGuest.ceremonyId, 'VALID', deviceInfo);
    this.statsGateway.broadcast(updatedGuest.ceremonyId).catch(() => {});

    return {
      valid: true,
      result: 'VALID',
      message: 'Entrée validée',
      guest: this.formatGuest(updatedGuest),
    };
  }

  private formatGuest(guest: any) {
    const displayName =
      guest.type === 'COUPLE' && guest.companionName
        ? `${guest.primaryName} et ${guest.companionName}`
        : guest.primaryName;
    return {
      id: guest.id,
      primaryName: guest.primaryName,
      companionName: guest.companionName,
      displayName,
      type: guest.type,
      numberOfSeats: guest.numberOfSeats,
      entryStatus: guest.entryStatus,
      table: guest.table ? { id: guest.table.id, name: guest.table.name } : null,
      ceremony: guest.ceremony
        ? { id: guest.ceremony.id, name: guest.ceremony.name, type: guest.ceremony.type }
        : null,
    };
  }

  private async logScan(
    user: any,
    token: string,
    guestId: string | null,
    ceremonyId: string | null,
    result: string,
    deviceInfo?: string,
  ) {
    try {
      await this.prisma.scanLog.create({
        data: {
          qrToken: token,
          scannedByUserId: user.sub || user.id,
          result: result as any,
          guestId: guestId || undefined,
          ceremonyId: ceremonyId || undefined,
          deviceInfo: deviceInfo || null,
        },
      });
    } catch {}
  }

  async stats(user: any, ceremonyId?: string) {
    const where: any =
      user.role === 'SUPER_ADMIN'
        ? ceremonyId ? { ceremonyId } : {}
        : ceremonyId
          ? { ceremonyId }
          : user.ceremonyScope
            ? { ceremony: { type: user.ceremonyScope } }
            : {};

    const [valid, alreadyUsed, wrongCeremony, invalid] = await Promise.all([
      this.prisma.scanLog.count({ where: { ...where, result: 'VALID' } }),
      this.prisma.scanLog.count({ where: { ...where, result: 'ALREADY_USED' } }),
      this.prisma.scanLog.count({ where: { ...where, result: 'WRONG_CEREMONY' } }),
      this.prisma.scanLog.count({ where: { ...where, result: 'INVALID' } }),
    ]);

    return {
      valid,
      alreadyUsed,
      wrongCeremony,
      invalid,
      total: valid + alreadyUsed + wrongCeremony + invalid,
    };
  }

  async history(user: any, ceremonyId: string | undefined, page = 1) {
    const take = 50;
    const skip = (page - 1) * take;

    const where: any =
      user.role === 'SUPER_ADMIN'
        ? ceremonyId ? { ceremonyId } : {}
        : ceremonyId
          ? { ceremonyId }
          : user.ceremonyScope
            ? { ceremony: { type: user.ceremonyScope } }
            : {};

    const [data, total] = await Promise.all([
      this.prisma.scanLog.findMany({
        where,
        orderBy: { scannedAt: 'desc' },
        skip,
        take,
        include: {
          guest: { select: { id: true, primaryName: true, companionName: true, type: true } },
          scannedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.scanLog.count({ where }),
    ]);

    return { data, total, page, pages: Math.ceil(total / take) };
  }
}
