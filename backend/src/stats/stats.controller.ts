import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private service: StatsService) {}

  @Get('live')
  live(
    @CurrentUser() user: any,
    @Query('ceremonyId') ceremonyId?: string,
  ) {
    return this.service.live(ceremonyId);
  }
}
