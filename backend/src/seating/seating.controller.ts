import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { SeatingService } from './seating.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('seating')
export class SeatingController {
  constructor(private service: SeatingService) {}

  @Get()    list(@CurrentUser() u: any, @Query('ceremonyId') cId?: string) { return this.service.list(u, cId); }
  @Post()   create(@Body() dto: any)          { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') delete(@Param('id') id: string) { return this.service.delete(id); }
  @Patch('assign') assign(@Body('guestId') guestId: string, @Body('tableId') tableId: string) {
    return this.service.assign(guestId, tableId || null);
  }
}
