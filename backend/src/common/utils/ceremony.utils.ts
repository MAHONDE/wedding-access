import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

export function ceremonyFilter(user: any): { ceremonyId?: string } {
  if (user.role === Role.SUPER_ADMIN) return {};
  return { ceremonyId: user.ceremonyId };
}

export function assertCeremonyAccess(user: any, ceremonyId: string) {
  if (user.role === Role.SUPER_ADMIN) return;
  if (user.ceremonyId !== ceremonyId) {
    throw new ForbiddenException('Accès à cette cérémonie non autorisé');
  }
}
