import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        ceremonyScope: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        ceremonyScope: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: string;
    ceremonyScope?: string | null;
    isActive?: boolean;
  }) {
    const passwordHash = await bcrypt.hash(dto.password || 'Temp1234!', 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as any,
        ceremonyScope: (dto.ceremonyScope as any) || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        ceremonyScope: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: string,
    dto: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      ceremonyScope?: string | null;
      isActive?: boolean;
    },
  ) {
    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.ceremonyScope !== undefined) data.ceremonyScope = dto.ceremonyScope;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        ceremonyScope: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
