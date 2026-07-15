import { Role, type Role as RoleType, UserStatus, type UserStatus as UserStatusType } from '../auth/roles.js';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: RoleType;
  status: UserStatusType;
};

export type PublicUser = AuthUser & {
  createdAt?: string;
};

export function toAuthUser(user: {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: RoleType;
  status: UserStatusType;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
  };
}

export function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: RoleType;
  status: UserStatusType;
  createdAt?: Date;
}): PublicUser {
  return {
    ...toAuthUser(user),
    ...(user.createdAt ? { createdAt: user.createdAt.toISOString() } : {}),
  };
}

export function usernameFromEmail(email: string): string {
  const base = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  return base.slice(0, 40);
}

export { Role, UserStatus };
