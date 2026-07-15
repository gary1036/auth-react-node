export const Role = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ALL_ROLES: Role[] = [Role.ADMIN, Role.USER];

/** Routes each role may access (path prefixes). Extend when adding roles. */
export const ROLE_ROUTE_ACCESS: Record<Role, readonly string[]> = {
  [Role.ADMIN]: ['/dashboard', '/users', '/weather'],
  [Role.USER]: ['/weather'],
};

export function isRole(value: unknown): value is Role {
  return value === Role.ADMIN || value === Role.USER;
}

export function hasRole(userRole: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(userRole);
}

export function defaultHomePath(role: Role): string {
  return role === Role.ADMIN ? '/dashboard' : '/weather';
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const allowed = ROLE_ROUTE_ACCESS[role] ?? [];
  return allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
