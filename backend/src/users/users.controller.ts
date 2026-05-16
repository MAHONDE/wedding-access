import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  list(@CurrentUser() user: any) {
    this.assertManageAccess(user);
    return this.service.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertManageAccess(user);
    return this.service.get(id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: any) {
    this.assertManageAccess(user);
    this.assertAllowedRole(user, dto.role);
    return this.service.create(dto);
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    this.assertManageAccess(user);
    if (dto.role) this.assertAllowedRole(user, dto.role);
    return this.service.update(id, dto);
  }

  /* Dedicated password change endpoint */
  @Patch(':id/password')
  changePassword(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    this.assertManageAccess(user);
    if (!password || password.length < 6) {
      throw new ForbiddenException('Le mot de passe doit comporter au moins 6 caractères');
    }
    return this.service.update(id, { password });
  }

  /* Dedicated enable/disable endpoint */
  @Patch(':id/disable')
  disable(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertManageAccess(user);
    return this.service.update(id, { isActive: false });
  }

  @Patch(':id/enable')
  enable(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertManageAccess(user);
    return this.service.update(id, { isActive: true });
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertManageAccess(user);
    return this.service.delete(id);
  }

  /* ── Guards ── */

  private assertManageAccess(user: any) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN_VIN_HONNEUR') {
      throw new ForbiddenException('Accès refusé');
    }
  }

  /* ADMIN_VIN_HONNEUR can only create/modify VH agents — not admins or other roles */
  private assertAllowedRole(user: any, targetRole: string) {
    if (user.role === 'SUPER_ADMIN') return; // no restriction
    const allowed = ['AGENT_VIN_HONNEUR'];
    if (!allowed.includes(targetRole)) {
      throw new ForbiddenException(
        'Vous pouvez uniquement créer des agents Vin d\'honneur',
      );
    }
  }
}
