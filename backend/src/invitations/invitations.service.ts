import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QrService } from '../qr/qr.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE = process.env.STORAGE_PATH || './storage';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private qr: QrService,
  ) {}

  private assertScope(user: any, ceremonyType: string) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.ceremonyScope && user.ceremonyScope !== ceremonyType) {
      throw new ForbiddenException('Accès à cette cérémonie non autorisé');
    }
  }

  async generate(user: any, guestId: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        ceremony: {
          include: {
            templates: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        table: true,
      },
    });
    if (!guest) throw new NotFoundException('Invité introuvable');
    this.assertScope(user, guest.ceremony.type);

    // Ensure active QR code exists
    const qrCode = await this.qr.ensureActiveForGuest(user, guestId);

    // Mark old invitations as OBSOLETE
    await this.prisma.invitation.updateMany({
      where: { guestId, isObsolete: false },
      data: { isObsolete: true, status: 'OBSOLETE' },
    });

    const activeTemplate = guest.ceremony.templates[0] || null;
    const dir = path.join(STORAGE, 'invitations');
    fs.mkdirSync(dir, { recursive: true });

    let pdfPath: string;
    let templateId: string | null = null;

    if (activeTemplate) {
      pdfPath = await this.generateFromTemplate(guest, qrCode, activeTemplate, dir);
      templateId = activeTemplate.id;
    } else {
      pdfPath = await this.generateDefault(guest, qrCode, dir);
    }

    const fileName = `invitation-${guestId}-${Date.now()}.pdf`;
    const finalPath = path.join(dir, fileName);
    if (pdfPath !== finalPath) {
      fs.renameSync(pdfPath, finalPath);
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        guestId,
        ceremonyId: guest.ceremonyId,
        qrCodeId: qrCode.id,
        templateId,
        pdfPath: finalPath,
        fileName,
        status: 'GENERATED',
        isObsolete: false,
      },
      include: {
        guest: { select: { id: true, primaryName: true } },
        ceremony: { select: { id: true, name: true } },
      },
    });

    return invitation;
  }

  private async generateDefault(guest: any, qrCode: any, dir: string): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([420, 595]); // A5
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();
    const gold = rgb(0.788, 0.659, 0.298);
    const dark = rgb(0.173, 0.173, 0.173);
    const muted = rgb(0.42, 0.396, 0.376);

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.973, 0.957) });
    // Border
    page.drawRectangle({ x: 12, y: 12, width: width - 24, height: height - 24, borderColor: gold, borderWidth: 0.8 });
    page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: gold, borderWidth: 0.3 });

    const ceremonyName = guest.ceremony.name || 'Mariage';
    const coupleW = fontSerif.widthOfTextAtSize(ceremonyName, 24);
    page.drawText(ceremonyName, { x: (width - coupleW) / 2, y: height - 80, size: 24, font: fontSerif, color: gold });

    page.drawLine({
      start: { x: 60, y: height - 100 },
      end: { x: width - 60, y: height - 100 },
      color: gold,
      thickness: 0.5,
    });

    const inviteText = 'vous invitent à célébrer leur mariage';
    const inviteW = fontSans.widthOfTextAtSize(inviteText, 10);
    page.drawText(inviteText, { x: (width - inviteW) / 2, y: height - 130, size: 10, font: fontSans, color: muted });

    const guestName = guest.primaryName;
    const guestW = fontSerif.widthOfTextAtSize(guestName, 20);
    page.drawText(guestName, { x: (width - guestW) / 2, y: height - 180, size: 20, font: fontSerif, color: dark });

    if (guest.companionName) {
      const companionLabel = `& ${guest.companionName}`;
      const compW = fontSerif.widthOfTextAtSize(companionLabel, 16);
      page.drawText(companionLabel, { x: (width - compW) / 2, y: height - 210, size: 16, font: fontSerif, color: dark });
    }

    const ceremDate = guest.ceremony.date
      ? new Date(guest.ceremony.date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
    if (ceremDate) {
      const dateW = fontSans.widthOfTextAtSize(ceremDate, 11);
      page.drawText(ceremDate, { x: (width - dateW) / 2, y: height - 250, size: 11, font: fontSans, color: muted });
    }

    if (guest.ceremony.location) {
      const locW = fontSans.widthOfTextAtSize(guest.ceremony.location, 10);
      page.drawText(guest.ceremony.location, { x: (width - locW) / 2, y: height - 275, size: 10, font: fontSans, color: muted });
    }

    if (guest.table) {
      const tableText = `Table : ${guest.table.name}`;
      const tableW = fontSerif.widthOfTextAtSize(tableText, 13);
      page.drawText(tableText, { x: (width - tableW) / 2, y: height - 315, size: 13, font: fontSerif, color: gold });
    }

    // QR Code
    const qrSize = 100;
    const qrX = (width - qrSize) / 2;
    const qrY = 70;
    page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, borderColor: gold, borderWidth: 0.5 });

    try {
      if (qrCode.qrImagePath && fs.existsSync(qrCode.qrImagePath)) {
        const qrBytes = fs.readFileSync(qrCode.qrImagePath);
        const qrImage = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      }
    } catch {}

    const tokenW = fontSans.widthOfTextAtSize(qrCode.token, 5);
    page.drawText(qrCode.token, { x: (width - tokenW) / 2, y: 48, size: 5, font: fontSans, color: muted });

    const tmpPath = path.join(dir, `_tmp_${guest.id}_${Date.now()}.pdf`);
    const bytes = await pdfDoc.save();
    fs.writeFileSync(tmpPath, bytes);
    return tmpPath;
  }

  private async generateFromTemplate(
    guest: any,
    qrCode: any,
    template: any,
    dir: string,
  ): Promise<string> {
    try {
      const templateBytes = fs.readFileSync(template.filePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const pages = pdfDoc.getPages();
      const page = pages[0];

      if (template.qrZoneConfig && qrCode.qrImagePath && fs.existsSync(qrCode.qrImagePath)) {
        const { x, y, width: w, height: h } = template.qrZoneConfig as any;
        const qrBytes = fs.readFileSync(qrCode.qrImagePath);
        const qrImage = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImage, { x, y, width: w, height: h });
      }

      const tmpPath = path.join(dir, `_tmp_${guest.id}_${Date.now()}.pdf`);
      const bytes = await pdfDoc.save();
      fs.writeFileSync(tmpPath, bytes);
      return tmpPath;
    } catch {
      // Fallback to default if template processing fails
      return this.generateDefault(guest, qrCode, dir);
    }
  }

  async generateBulk(user: any, ceremonyId: string) {
    const guests = await this.prisma.guest.findMany({ where: { ceremonyId } });
    const results = await Promise.allSettled(
      guests.map((g) => this.generate(user, g.id)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { total: guests.length, succeeded, failed };
  }

  async getById(user: any, id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: {
        guest: { select: { id: true, primaryName: true, ceremonyId: true } },
        ceremony: { select: { id: true, name: true, type: true } },
        qrCode: { select: { id: true, token: true, isActive: true } },
      },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    this.assertScope(user, invitation.ceremony.type);
    return invitation;
  }

  async download(user: any, id: string): Promise<string> {
    const invitation = await this.getById(user, id);
    if (!invitation.pdfPath || !fs.existsSync(invitation.pdfPath)) {
      throw new NotFoundException('Fichier PDF introuvable');
    }
    return invitation.pdfPath;
  }

  async updateStatus(user: any, id: string, status: string) {
    const invitation = await this.getById(user, id);
    return this.prisma.invitation.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async regenerate(user: any, guestId: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { ceremony: true },
    });
    if (!guest) throw new NotFoundException('Invité introuvable');
    this.assertScope(user, guest.ceremony.type);

    // Disable active QR codes
    const activeQr = await this.prisma.qRCode.findFirst({
      where: { guestId, isActive: true },
    });
    if (activeQr) {
      await this.qr.regenerate(user, activeQr.id);
    }

    // Mark existing invitations obsolete (done inside generate())
    return this.generate(user, guestId);
  }
}
