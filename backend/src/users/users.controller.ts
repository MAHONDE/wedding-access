import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN' as any)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()    list()                              { return this.service.list(); }
  @Post()   create(@Body() dto: any)            { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') delete(@Param('id') id: string) { return this.service.delete(id); }
}
