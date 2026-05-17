import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || './storage';

@Injectable()
export class SeatingPlansService {
  constructor(private prisma: PrismaService) {}

  private assertScope(user: any, ceremonyType: string) {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.ceremonyScope && user.ceremonyScope !== ceremonyType) {
      throw new ForbiddenException('Accès à cette cérémonie non autorisé');
    }
  }

  async list(user: any, ceremonyId?: string) {
    const where: any = {};
    if (ceremonyId) {
      where.ceremonyId = ceremonyId;
    } else if (user.role !== 'SUPER_ADMIN' && user.ceremonyScope) {
      where.ceremony = { type: user.ceremonyScope };
    }

    return this.prisma.seatingPlan.findMany({
      where,
      include: {
        ceremony: { select: { id: true, name: true, type: true } },
        roomPhotos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: any, dto: { ceremonyId: string; name: string; planData?: any; sourceType?: string }) {
    const ceremony = await this.prisma.ceremony.findUnique({ where: { id: dto.ceremonyId } });
    if (!ceremony) throw new NotFoundException('Cérémonie introuvable');
    this.assertScope(user, ceremony.type);

    return this.prisma.seatingPlan.create({
      data: {
        ceremonyId: dto.ceremonyId,
        name: dto.name,
        planData: dto.planData || {},
        sourceType: (dto.sourceType as any) || 'MANUAL',
      },
      include: {
        ceremony: { select: { id: true, name: true, type: true } },
        roomPhotos: true,
      },
    });
  }

  async update(user: any, id: string, dto: { name?: string; planData?: any }) {
    const plan = await this.prisma.seatingPlan.findUnique({
      where: { id },
      include: { ceremony: true },
    });
    if (!plan) throw new NotFoundException('Plan de salle introuvable');
    this.assertScope(user, plan.ceremony.type);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.planData !== undefined) data.planData = dto.planData;

    return this.prisma.seatingPlan.update({ where: { id }, data });
  }

  async delete(user: any, id: string) {
    const plan = await this.prisma.seatingPlan.findUnique({
      where: { id },
      include: { ceremony: true },
    });
    if (!plan) throw new NotFoundException('Plan de salle introuvable');
    this.assertScope(user, plan.ceremony.type);

    return this.prisma.seatingPlan.delete({ where: { id } });
  }

  async addRoomPhoto(user: any, id: string, file: Express.Multer.File) {
    const plan = await this.prisma.seatingPlan.findUnique({
      where: { id },
      include: { ceremony: true },
    });
    if (!plan) throw new NotFoundException('Plan de salle introuvable');
    this.assertScope(user, plan.ceremony.type);

    const dir = path.join(STORAGE, 'seating-photos');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${id}-${Date.now()}${ext}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.roomPhoto.create({
      data: { seatingPlanId: id, filePath },
    });
  }

  async generatePdf(user: any, id: string) {
    const plan = await this.prisma.seatingPlan.findUnique({
      where: { id },
      include: {
        ceremony: {
          include: {
            tables: { include: { guests: true } },
          },
        },
        roomPhotos: true,
      },
    });
    if (!plan) throw new NotFoundException('Plan de salle introuvable');
    this.assertScope(user, plan.ceremony.type);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();
    const gold = rgb(0.788, 0.659, 0.298);
    const dark = rgb(0.173, 0.173, 0.173);
    const muted = rgb(0.42, 0.396, 0.376);

    // Title
    page.drawText(`Plan de salle — ${plan.ceremony.name}`, {
      x: 40, y: height - 50,
      size: 20, font: fontSerif, color: gold,
    });
    page.drawText(plan.name, {
      x: 40, y: height - 75,
      size: 12, font: fontSans, color: dark,
    });
    page.drawLine({
      start: { x: 40, y: height - 85 },
      end: { x: width - 40, y: height - 85 },
      color: gold, thickness: 0.5,
    });

    // Render tables
    let yOffset = height - 110;
    let xOffset = 40;
    const colWidth = (width - 80) / 3;

    for (const table of plan.ceremony.tables) {
      if (yOffset < 100) {
        yOffset = height - 110;
        xOffset += colWidth;
      }

      page.drawText(`${table.name} (${table.numberOfChairs} places)`, {
        x: xOffset, y: yOffset,
        size: 10, font: fontSans, color: gold,
      });
      yOffset -= 16;

      for (const guest of table.guests) {
        const displayName = (guest.type === 'COUPLE' && guest.companionName)
          ? `${guest.primaryName} et ${guest.companionName}`
          : guest.primaryName;
        const label = `• ${displayName}`;
        page.drawText(label, {
          x: xOffset + 10, y: yOffset,
          size: 8, font: fontSans, color: dark,
        });
        yOffset -= 12;
      }

      if (table.guests.length === 0) {
        page.drawText('(aucun invité assigné)', {
          x: xOffset + 10, y: yOffset,
          size: 8, font: fontSans, color: muted,
        });
        yOffset -= 12;
      }

      yOffset -= 8;
    }

    const dir = path.join(STORAGE, 'seating-pdfs');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `seating-plan-${id}-${Date.now()}.pdf`);
    const bytes = await pdfDoc.save();
    fs.writeFileSync(filePath, bytes);

    await this.prisma.seatingPlan.update({ where: { id }, data: { pdfPath: filePath } });
    return { filePath };
  }

  async downloadPdf(user: any, id: string): Promise<string> {
    const plan = await this.prisma.seatingPlan.findUnique({
      where: { id },
      include: { ceremony: true },
    });
    if (!plan) throw new NotFoundException('Plan de salle introuvable');
    this.assertScope(user, plan.ceremony.type);

    if (!plan.pdfPath || !fs.existsSync(plan.pdfPath)) {
      const result = await this.generatePdf(user, id);
      return result.filePath;
    }
    return plan.pdfPath;
  }
}
