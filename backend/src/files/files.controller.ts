import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE = process.env.STORAGE_PATH || './storage';

const ALLOWED_TYPES = [
  'qrcodes',
  'invitations',
  'templates',
  'branding',
  'seating-photos',
  'seating-pdfs',
];

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  @Get(':type/:filename')
  serveFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new NotFoundException('Type de fichier non autorisé');
    }

    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(STORAGE, type, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fichier introuvable');
    }

    const mimeType = getMimeType(filePath);
    res.set('Content-Type', mimeType);
    fs.createReadStream(filePath).pipe(res);
  }
}
