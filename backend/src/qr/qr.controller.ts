import { Body, Controller, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('qr')
export class QrController {
  constructor(private service: QrService) {}

  /* Generate QR for a single guest */
  @Post(':guestId')
  generate(@CurrentUser() user: any, @Param('guestId') guestId: string) {
    return this.service.generate(user, guestId);
  }

  /* Bulk generate QR codes for all guests of a ceremony that don't have one */
  @Post('bulk/generate')
  generateBulk(
    @CurrentUser() user: any,
    @Body('ceremonyId') ceremonyId: string,
  ) {
    return this.service.generateBulk(user, ceremonyId);
  }

  /* Regenerate QR for a guest (by QR id) */
  @Post(':id/regenerate')
  regenerate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.regenerate(user, id);
  }

  /* Disable a specific QR code */
  @Patch(':id/disable')
  disable(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.disable(user, id);
  }
}
