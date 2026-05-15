import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as fs from 'fs';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private service: InvitationsService) {}

  @Post('bulk')
  generateBulk(
    @CurrentUser() user: any,
    @Body('ceremonyId') ceremonyId: string,
  ) {
    return this.service.generateBulk(user, ceremonyId);
  }

  @Post(':guestId/regenerate')
  regenerate(
    @CurrentUser() user: any,
    @Param('guestId') guestId: string,
  ) {
    return this.service.regenerate(user, guestId);
  }

  @Post(':guestId')
  generate(
    @CurrentUser() user: any,
    @Param('guestId') guestId: string,
  ) {
    return this.service.generate(user, guestId);
  }

  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getById(user, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const filePath = await this.service.download(user, id);
    const fileName = path.basename(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(user, id, status);
  }
}
