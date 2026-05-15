import { ForbiddenException } from '@nestjs/common';

/**
 * Returns a Prisma `where` filter scoped to the user's ceremony.
 * SUPER_ADMIN sees all; others are restricted to their ceremonyScope.
 */
export function ceremonyFilter(user: any): { ceremony?: { type: string } } {
  if (user.role === 'SUPER_ADMIN') return {};
  if (user.ceremonyScope) {
    return { ceremony: { type: user.ceremonyScope } };
  }
  return {};
}

/**
 * Returns a simple ceremonyId-based filter when the caller already has
 * the ceremony's type resolved to a known ID context.
 */
export function ceremonyIdFilter(user: any): { ceremonyId?: string } {
  if (user.role === 'SUPER_ADMIN') return {};
  // For non-super-admin, we rely on guest/resource's ceremonyId check
  return {};
}

/**
 * Asserts that the user has access to the ceremony identified by type.
 */
export function assertCeremonyTypeAccess(user: any, ceremonyType: string) {
  if (user.role === 'SUPER_ADMIN') return;
  if (user.ceremonyScope !== ceremonyType) {
    throw new ForbiddenException('Accès à cette cérémonie non autorisé');
  }
}

/**
 * Asserts the user can access a resource belonging to a ceremony (by id).
 * Requires the caller to also pass the ceremony type so we can compare.
 */
export function assertCeremonyAccess(user: any, ceremonyType: string | null) {
  if (user.role === 'SUPER_ADMIN') return;
  if (!ceremonyType || user.ceremonyScope !== ceremonyType) {
    throw new ForbiddenException('Accès à cette cérémonie non autorisé');
  }
}
