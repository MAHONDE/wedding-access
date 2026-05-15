import { Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private service: InvitationsService) {}

  @Post(':guestId')
  generate(@Param('guestId') id: string) {
    return this.service.generate(id).then(p => ({ path: p }));
  }

  @Get(':guestId/pdf')
  async download(@Param('guestId') id: string, @Res() res: Response) {
    const filePath = await this.service.getPdfPath(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invitation-${id}.pdf"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
