import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

/* Simple in-memory rate limiter: max 10 attempts / 15 min per IP */
const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const RATE_MAX    = 10;
const RATE_WINDOW = 15 * 60 * 1000;

function checkRateLimit(ip: string): void {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now - rec.firstAt > RATE_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAt: now });
    return;
  }
  rec.count++;
  if (rec.count > RATE_MAX) {
    throw new HttpException(
      'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    checkRateLimit(ip);
    try {
      const result = await this.auth.login(dto.email, dto.password);
      resetRateLimit(ip); // reset on successful login
      return result;
    } catch (err) {
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.auth.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  logout() {
    /* JWT is stateless — the client discards the token.
       This endpoint exists for spec compliance and frontend symmetry. */
    return;
  }
}
