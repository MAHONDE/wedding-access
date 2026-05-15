import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { BrandingService } from './branding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('branding')
export class BrandingController {
  constructor(private service: BrandingService) {}

  @Get(':ceremonyId')
  get(@Param('ceremonyId') id: string) { return this.service.get(id); }

  @Put(':ceremonyId')
  update(@Param('ceremonyId') id: string, @Body() dto: any) { return this.service.update(id, dto); }
}
