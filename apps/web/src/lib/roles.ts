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

export type NavItem = {
  path: string;
  label: string;
  roles: readonly Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', roles: [Role.ADMIN] },
  { path: '/users', label: 'User Management', roles: [Role.ADMIN] },
  { path: '/weather', label: 'Weather', roles: [Role.ADMIN, Role.USER] },
];

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
  const item = NAV_ITEMS.find(
    (nav) => pathname === nav.path || pathname.startsWith(`${nav.path}/`),
  );
  if (!item) return false;
  return hasRole(role, item.roles);
}

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasRole(role, item.roles));
}
