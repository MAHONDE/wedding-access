import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: { id:true, email:true, firstName:true, lastName:true, role:true, ceremonyId:true, isActive:true },
      orderBy: { lastName: 'asc' },
    });
  }

  async create(dto: any) {
    const passwordHash = await bcrypt.hash(dto.password || 'Temp1234!', 12);
    return this.prisma.user.create({
      data: { ...dto, password: undefined, passwordHash },
      select: { id:true, email:true, firstName:true, lastName:true, role:true, ceremonyId:true, isActive:true },
    });
  }

  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id:true, email:true, firstName:true, lastName:true, role:true, ceremonyId:true, isActive:true },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
