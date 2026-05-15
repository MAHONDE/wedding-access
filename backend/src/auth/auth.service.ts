import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      ceremonyScope: user.ceremonyScope,
    };
    const access_token = this.jwt.sign(payload);

    const { passwordHash, ...safeUser } = user;
    return { access_token, user: safeUser };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        ceremonyScope: true,
        isActive: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
