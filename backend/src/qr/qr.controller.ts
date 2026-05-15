import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('qr')
export class QrController {
  constructor(private service: QrService) {}

  @Post(':guestId')
  generate(@Param('guestId') id: string) {
    return this.service.generate(id);
  }

  @Post(':guestId/regenerate')
  regenerate(@Param('guestId') id: string) {
    return this.service.regenerate(id);
  }
}
