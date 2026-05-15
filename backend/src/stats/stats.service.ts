import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async live(ceremonyId?: string) {
    const guestWhere: any = ceremonyId ? { ceremonyId } : {};
    const scanWhere: any = ceremonyId ? { ceremonyId } : {};
    const qrWhere: any = ceremonyId ? { ceremonyId } : {};
    const invitationWhere: any = ceremonyId ? { ceremonyId } : {};

    const [
      totalGuests,
      totalIndividual,
      totalCouple,
      arrived,
      qrGenerated,
      qrActive,
      invitationsGenerated,
      invitationsSentWhatsapp,
      invitationsSentBluetooth,
      invitationsNotSent,
      scanValid,
      scanInvalid,
      scanAlreadyUsed,
      scanWrongCeremony,
    ] = await Promise.all([
      this.prisma.guest.count({ where: guestWhere }),
      this.prisma.guest.count({ where: { ...guestWhere, type: 'INDIVIDUAL' } }),
      this.prisma.guest.count({ where: { ...guestWhere, type: 'COUPLE' } }),
      this.prisma.guest.count({ where: { ...guestWhere, entryStatus: 'ARRIVED' } }),
      this.prisma.qRCode.count({ where: qrWhere }),
      this.prisma.qRCode.count({ where: { ...qrWhere, isActive: true } }),
      this.prisma.invitation.count({ where: { ...invitationWhere, status: 'GENERATED', isObsolete: false } }),
      this.prisma.invitation.count({ where: { ...invitationWhere, status: 'SENT_WHATSAPP', isObsolete: false } }),
      this.prisma.invitation.count({ where: { ...invitationWhere, status: 'SENT_BLUETOOTH', isObsolete: false } }),
      this.prisma.invitation.count({ where: { ...invitationWhere, status: 'NOT_SENT', isObsolete: false } }),
      this.prisma.scanLog.count({ where: { ...scanWhere, result: 'VALID' } }),
      this.prisma.scanLog.count({ where: { ...scanWhere, result: 'INVALID' } }),
      this.prisma.scanLog.count({ where: { ...scanWhere, result: 'ALREADY_USED' } }),
      this.prisma.scanLog.count({ where: { ...scanWhere, result: 'WRONG_CEREMONY' } }),
    ]);

    const seatsAggregate = await this.prisma.guest.aggregate({
      where: guestWhere,
      _sum: { numberOfSeats: true },
    });
    const totalSeats = seatsAggregate._sum.numberOfSeats ?? 0;

    // Table capacity stats
    const tables = await this.prisma.table.findMany({
      where: ceremonyId ? { ceremonyId } : {},
      include: { guests: true },
    });

    const tableStats = tables.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.numberOfChairs,
      occupied: t.guests.reduce((sum, g) => sum + g.numberOfSeats, 0),
    }));

    const totalCapacity = tableStats.reduce((s, t) => s + t.capacity, 0);
    const totalOccupied = tableStats.reduce((s, t) => s + t.occupied, 0);

    return {
      guests: {
        total: totalGuests,
        totalIndividual,
        totalCouple,
        totalSeats,
        arrived,
        notArrived: totalGuests - arrived,
      },
      qrCodes: {
        total: qrGenerated,
        active: qrActive,
      },
      invitations: {
        generated: invitationsGenerated,
        sentWhatsapp: invitationsSentWhatsapp,
        sentBluetooth: invitationsSentBluetooth,
        notSent: invitationsNotSent,
      },
      scans: {
        valid: scanValid,
        invalid: scanInvalid,
        alreadyUsed: scanAlreadyUsed,
        wrongCeremony: scanWrongCeremony,
        total: scanValid + scanInvalid + scanAlreadyUsed + scanWrongCeremony,
      },
      tables: {
        totalCapacity,
        totalOccupied,
        list: tableStats,
      },
      timestamp: new Date(),
    };
  }
}
