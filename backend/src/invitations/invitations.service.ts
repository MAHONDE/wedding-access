import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { QrService } from '../qr/qr.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCodeLib from 'qrcode';
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

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  private buildGuestFileName(guest: any): string {
    let label = guest.primaryName;
    if (guest.type === 'COUPLE' && guest.companionName) {
      label = `${guest.primaryName} et ${guest.companionName}`;
    }
    return this.sanitizeFileName(label) + '.pdf';
  }

  private getUniqueFilePath(dir: string, baseFileName: string): { filePath: string; fileName: string } {
    const ext = '.pdf';
    const base = baseFileName.endsWith(ext) ? baseFileName.slice(0, -ext.length) : baseFileName;

    let fileName = `${base}${ext}`;
    if (!fs.existsSync(path.join(dir, fileName))) {
      return { filePath: path.join(dir, fileName), fileName };
    }

    for (let i = 2; i <= 999; i++) {
      fileName = `${base}-${i}${ext}`;
      const filePath = path.join(dir, fileName);
      if (!fs.existsSync(filePath)) return { filePath, fileName };
    }

    fileName = `${base}-${Date.now()}${ext}`;
    return { filePath: path.join(dir, fileName), fileName };
  }

  /** Get QR PNG as buffer. Tries stored file first; regenerates from token if missing. */
  private async resolveQrBuffer(qrCode: any): Promise<Buffer> {
    if (qrCode.qrImagePath && fs.existsSync(qrCode.qrImagePath)) {
      return fs.readFileSync(qrCode.qrImagePath);
    }

    // File was wiped (e.g. ephemeral FS after redeploy). Regenerate from token.
    const buffer = await QRCodeLib.toBuffer(qrCode.token, { width: 300, margin: 2 }) as Buffer;

    // Save back to disk for next time (best-effort)
    try {
      const dir = path.join(STORAGE, 'qrcodes');
      fs.mkdirSync(dir, { recursive: true });
      const qrPath = path.join(dir, `${qrCode.token}.png`);
      fs.writeFileSync(qrPath, buffer);
      await this.prisma.qRCode.update({ where: { id: qrCode.id }, data: { qrImagePath: qrPath } });
    } catch {}

    return buffer;
  }

  async generate(user: any, guestId: string) {
    // 1. Fetch guest with ceremony + active template
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
    if (!guest || guest.deletedAt) throw new NotFoundException('Invité introuvable');
    this.assertScope(user, guest.ceremony.type);

    const activeTemplate = guest.ceremony.templates[0] || null;

    // 2. Validate template has qrZoneConfig when a template is active
    if (activeTemplate && !activeTemplate.qrZoneConfig) {
      throw new BadRequestException(
        'Zone QR non configurée pour ce template. Veuillez définir la zone QR dans la gestion des templates.',
      );
    }

    // 3. Ensure active QR code exists
    const qrCode = await this.qr.ensureActiveForGuest(user, guestId);

    // 4. Resolve QR image buffer — never null, always available
    let qrBuffer: Buffer;
    try {
      qrBuffer = await this.resolveQrBuffer(qrCode);
    } catch {
      throw new InternalServerErrorException('Impossible de générer le QR code.');
    }

    // 5. Mark older invitations obsolete
    await this.prisma.invitation.updateMany({
      where: { guestId, isObsolete: false },
      data: { isObsolete: true, status: 'OBSOLETE' },
    });

    // 6. Resolve monogram buffer (optional, best-effort)
    const branding = await this.prisma.appBranding.findFirst();
    let monogramBuffer: Buffer | null = null;
    if (branding?.monogramPath && fs.existsSync(branding.monogramPath)) {
      monogramBuffer = fs.readFileSync(branding.monogramPath);
    } else if (branding?.monogramData) {
      monogramBuffer = Buffer.from(branding.monogramData, 'base64');
    }

    // 7. Generate PDF
    const dir = path.join(STORAGE, 'invitations');
    fs.mkdirSync(dir, { recursive: true });

    let tmpPath: string;
    if (activeTemplate) {
      tmpPath = await this.generateFromTemplate(guest, qrCode, qrBuffer, activeTemplate, dir, monogramBuffer);
    } else {
      tmpPath = await this.generateDefault(guest, qrCode, qrBuffer, dir, monogramBuffer);
    }

    // 8. Rename to guest-named file
    const baseFileName = this.buildGuestFileName(guest);
    const { filePath: finalPath, fileName } = this.getUniqueFilePath(dir, baseFileName);
    if (tmpPath !== finalPath) {
      fs.renameSync(tmpPath, finalPath);
    }

    // 9. Save invitation — status GENERATED only after successful PDF creation
    const invitation = await this.prisma.invitation.create({
      data: {
        guestId,
        ceremonyId: guest.ceremonyId,
        qrCodeId: qrCode.id,
        templateId: activeTemplate?.id ?? null,
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

  /* ── Default PDF layout (no template) ── */
  private async generateDefault(
    guest: any,
    qrCode: any,
    qrBuffer: Buffer,
    dir: string,
    monogramBuffer?: Buffer | null,
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([420, 595]);
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSans  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();
    const gold  = rgb(0.788, 0.659, 0.298);
    const dark  = rgb(0.173, 0.173, 0.173);
    const muted = rgb(0.42,  0.396, 0.376);

    page.drawRectangle({ x: 0,  y: 0,  width, height, color: rgb(0.98, 0.973, 0.957) });
    page.drawRectangle({ x: 12, y: 12, width: width - 24, height: height - 24, borderColor: gold, borderWidth: 0.8 });
    page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: gold, borderWidth: 0.3 });

    // Couple monogram at top center
    let yShift = 0;
    if (monogramBuffer) {
      try {
        let monoImg;
        try { monoImg = await pdfDoc.embedPng(monogramBuffer); }
        catch { monoImg = await pdfDoc.embedJpg(monogramBuffer); }
        const MONO_W = 80;
        const MONO_H = Math.round(MONO_W * monoImg.height / monoImg.width);
        page.drawImage(monoImg, { x: (width - MONO_W) / 2, y: height - MONO_H - 20, width: MONO_W, height: MONO_H });
        yShift = MONO_H + 18;
      } catch {}
    }

    const ceremonyName = guest.ceremony.name || 'Mariage';
    const coupleW = fontSerif.widthOfTextAtSize(ceremonyName, 22);
    page.drawText(ceremonyName, { x: (width - coupleW) / 2, y: height - 80 - yShift, size: 22, font: fontSerif, color: gold });

    page.drawLine({
      start: { x: 60, y: height - 100 - yShift },
      end:   { x: width - 60, y: height - 100 - yShift },
      color: gold, thickness: 0.5,
    });

    const inviteText = 'vous invitent à célébrer leur mariage';
    const inviteW = fontSans.widthOfTextAtSize(inviteText, 10);
    page.drawText(inviteText, { x: (width - inviteW) / 2, y: height - 128 - yShift, size: 10, font: fontSans, color: muted });

    const guestW = fontSerif.widthOfTextAtSize(guest.primaryName, 20);
    page.drawText(guest.primaryName, { x: (width - guestW) / 2, y: height - 174 - yShift, size: 20, font: fontSerif, color: dark });

    if (guest.companionName) {
      const companionLabel = `& ${guest.companionName}`;
      const compW = fontSerif.widthOfTextAtSize(companionLabel, 15);
      page.drawText(companionLabel, { x: (width - compW) / 2, y: height - 202 - yShift, size: 15, font: fontSerif, color: dark });
    }

    const ceremDate = guest.ceremony.date
      ? new Date(guest.ceremony.date).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
      : '';
    if (ceremDate) {
      const dateW = fontSans.widthOfTextAtSize(ceremDate, 11);
      page.drawText(ceremDate, { x: (width - dateW) / 2, y: height - 238 - yShift, size: 11, font: fontSans, color: muted });
    }

    if (guest.ceremony.location) {
      const locW = fontSans.widthOfTextAtSize(guest.ceremony.location, 10);
      page.drawText(guest.ceremony.location, { x: (width - locW) / 2, y: height - 260 - yShift, size: 10, font: fontSans, color: muted });
    }

    if (guest.table) {
      const tableText = `Table : ${guest.table.name}`;
      const tableW = fontSerif.widthOfTextAtSize(tableText, 13);
      page.drawText(tableText, { x: (width - tableW) / 2, y: height - 296 - yShift, size: 13, font: fontSerif, color: gold });
    }

    // QR code — always embedded (qrBuffer is guaranteed non-null)
    const qrSize = yShift > 0 ? 88 : 100;
    const qrX    = (width - qrSize) / 2;
    const qrY    = 70;
    page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, borderColor: gold, borderWidth: 0.5 });

    const qrImage = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const tokenW = fontSans.widthOfTextAtSize(qrCode.token, 5);
    page.drawText(qrCode.token, { x: (width - tokenW) / 2, y: 48, size: 5, font: fontSans, color: muted });

    const tmpPath = path.join(dir, `_tmp_${guest.id}_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, await pdfDoc.save());
    return tmpPath;
  }

  /* ── Template-based PDF layout ── */
  private async generateFromTemplate(
    guest: any,
    qrCode: any,
    qrBuffer: Buffer,
    template: any,
    dir: string,
    monogramBuffer?: Buffer | null,
  ): Promise<string> {
    // qrZoneConfig is validated upstream — it is guaranteed to exist here
    const { x, y, width: w, height: h } = template.qrZoneConfig as any;

    const templateBytes = fs.readFileSync(template.filePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages  = pdfDoc.getPages();
    const page   = pages[0];
    const { width, height } = page.getSize();

    // Couple monogram in upper-right corner
    if (monogramBuffer) {
      try {
        let monoImg;
        try { monoImg = await pdfDoc.embedPng(monogramBuffer); }
        catch { monoImg = await pdfDoc.embedJpg(monogramBuffer); }
        const MONO_W = 60;
        const MONO_H = Math.round(MONO_W * monoImg.height / monoImg.width);
        page.drawImage(monoImg, { x: width - MONO_W - 14, y: height - MONO_H - 14, width: MONO_W, height: MONO_H });
      } catch {}
    }

    // QR code — always embedded at qrZoneConfig position
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qrImage, { x, y, width: w, height: h });

    const tmpPath = path.join(dir, `_tmp_${guest.id}_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, await pdfDoc.save());
    return tmpPath;
  }

  async generateBulk(user: any, ceremonyId: string) {
    const guests = await this.prisma.guest.findMany({
      where: { ceremonyId, deletedAt: null },
    });
    const results = await Promise.allSettled(
      guests.map((g) => this.generate(user, g.id)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.filter((r) => r.status === 'rejected').length;

    return { total: guests.length, succeeded, failed };
  }

  async getById(user: any, id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: {
        guest:   { select: { id: true, primaryName: true, ceremonyId: true } },
        ceremony: { select: { id: true, name: true, type: true } },
        qrCode:  { select: { id: true, token: true, isActive: true } },
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
    await this.getById(user, id);
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
    if (!guest || guest.deletedAt) throw new NotFoundException('Invité introuvable');
    this.assertScope(user, guest.ceremony.type);

    const activeQr = await this.prisma.qRCode.findFirst({
      where: { guestId, isActive: true },
    });
    if (activeQr) {
      await this.qr.regenerate(user, activeQr.id);
    }

    return this.generate(user, guestId);
  }
}
