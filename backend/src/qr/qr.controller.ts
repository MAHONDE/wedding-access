import { Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('qr')
export class QrController {
  constructor(private service: QrService) {}

  @Post(':guestId')
  generate(@CurrentUser() user: any, @Param('guestId') guestId: string) {
    return this.service.generate(user, guestId);
  }

  @Post(':id/regenerate')
  regenerate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.regenerate(user, id);
  }

  @Patch(':id/disable')
  disable(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.disable(user, id);
  }
}
