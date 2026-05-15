import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ScansService } from './scans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scans')
export class ScansController {
  constructor(private service: ScansService) {}

  @Post('verify')
  verify(@CurrentUser() user: any, @Body('token') token: string) {
    return this.service.verify(user, token);
  }

  @Post('mark-entry')
  markEntry(@CurrentUser() user: any, @Body('token') token: string) {
    return this.service.markEntry(user, token);
  }

  @Get('history')
  history(
    @CurrentUser() user: any,
    @Query('ceremonyId') ceremonyId?: string,
    @Query('page') page?: number,
  ) {
    return this.service.history(user, ceremonyId, page ? Number(page) : 1);
  }
}
