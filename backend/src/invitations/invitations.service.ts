import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QrService } from '../qr/qr.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE = process.env.STORAGE_PATH || '/app/storage';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private qr: QrService,
  ) {}

  async generate(guestId: string): Promise<string> {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { ceremony: { include: { branding: true, templates: { where: { isActive: true } } } } },
    });
    if (!guest) throw new NotFoundException('Invité introuvable');

    // Ensure QR code exists
    const qrToken = await this.qr.generate(guestId);

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([420, 595]); // A5

    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSans  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();
    const gold = rgb(0.788, 0.659, 0.298);
    const dark = rgb(0.173, 0.173, 0.173);
    const muted = rgb(0.42, 0.396, 0.376);

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.973, 0.957) });

    // Border
    page.drawRectangle({ x: 12, y: 12, width: width - 24, height: height - 24, borderColor: gold, borderWidth: 0.8, color: rgb(1,1,1,0) });
    page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: gold, borderWidth: 0.3, color: rgb(1,1,1,0) });

    const branding = guest.ceremony.branding;
    const coupleName = branding?.coupleName || 'M & J';
    const eventDate = branding?.eventDate
      ? new Date(branding.eventDate).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
      : '4 juillet 2026';

    // Couple name
    const coupleW = fontSerif.widthOfTextAtSize(coupleName, 32);
    page.drawText(coupleName, { x: (width - coupleW) / 2, y: height - 90, size: 32, font: fontSerif, color: gold });

    // Divider line
    page.drawLine({ start: { x: 60, y: height - 108 }, end: { x: width - 60, y: height - 108 }, color: gold, thickness: 0.5 });

    // Invitation text
    const inviteText = 'vous invitent à célébrer leur mariage';
    const inviteW = fontSans.widthOfTextAtSize(inviteText, 10);
    page.drawText(inviteText, { x: (width - inviteW) / 2, y: height - 140, size: 10, font: fontSans, color: muted });

    // Guest name
    const guestName = `${guest.firstName} ${guest.lastName}`;
    const guestW = fontSerif.widthOfTextAtSize(guestName, 20);
    page.drawText(guestName, { x: (width - guestW) / 2, y: height - 190, size: 20, font: fontSerif, color: dark });

    // Date
    const dateW = fontSans.widthOfTextAtSize(eventDate, 11);
    page.drawText(eventDate, { x: (width - dateW) / 2, y: height - 240, size: 11, font: fontSans, color: muted });

    // Venue
    if (guest.ceremony.venue) {
      const venueW = fontSans.widthOfTextAtSize(guest.ceremony.venue, 10);
      page.drawText(guest.ceremony.venue, { x: (width - venueW) / 2, y: height - 265, size: 10, font: fontSans, color: muted });
    }

    // Table
    if (guest.tableNumber) {
      const tableText = `Table ${guest.tableNumber}`;
      const tableW = fontSerif.widthOfTextAtSize(tableText, 13);
      page.drawText(tableText, { x: (width - tableW) / 2, y: height - 300, size: 13, font: fontSerif, color: gold });
    }

    // QR placeholder zone (bottom center)
    const qrSize = 90;
    const qrX = (width - qrSize) / 2;
    const qrY = 60;
    page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, borderColor: gold, borderWidth: 0.5, color: rgb(1,1,1,0) });

    // Try to embed QR image
    try {
      const qrPath = path.join(STORAGE, 'qrcodes', `${guestId}.png`);
      if (fs.existsSync(qrPath)) {
        const qrBytes = fs.readFileSync(qrPath);
        const qrImage = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      }
    } catch {}

    // Token text
    const tokenW = fontSans.widthOfTextAtSize(qrToken, 6);
    page.drawText(qrToken, { x: (width - tokenW) / 2, y: 44, size: 6, font: fontSans, color: muted });

    // Save
    const dir = path.join(STORAGE, 'invitations');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${guestId}.pdf`);
    const bytes = await pdfDoc.save();
    fs.writeFileSync(filePath, bytes);

    await this.prisma.guest.update({
      where: { id: guestId },
      data: { invitationPath: filePath, invitationStatus: 'GENERATED' },
    });

    return filePath;
  }

  async getPdfPath(guestId: string): Promise<string> {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException();

    if (!guest.invitationPath || !fs.existsSync(guest.invitationPath)) {
      return this.generate(guestId);
    }
    return guest.invitationPath;
  }
}
