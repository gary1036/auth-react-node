import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { isRole } from '../auth/roles.js';
import { toAuthUser, type AuthUser } from '../auth/user.js';
import type { Env } from '../config/env.js';
import { prisma } from './prisma.js';

function accessSecret(env: Env) {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return 900;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function signAccessToken(env: Env, user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(accessSecret(env));
}

export async function verifyAccessToken(env: Env, token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, accessSecret(env));
  if (!payload.sub || typeof payload.email !== 'string') {
    throw new Error('Invalid access token payload');
  }

  const dbUser = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!dbUser) {
    throw new Error('User not found');
  }

  return toAuthUser(dbUser);
}

export async function issueTokenPair(env: Env, user: AuthUser) {
  const accessToken = await signAccessToken(env, user);
  const refreshToken = randomBytes(48).toString('hex');
  const expiresInSeconds = parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer' as const,
    expiresIn: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  };
}

export async function rotateRefreshToken(env: Env, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    throw new Error('Invalid or expired refresh token');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  if (!isRole(stored.user.role)) {
    throw new Error('Invalid user role');
  }

  return issueTokenPair(env, toAuthUser(stored.user));
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export { toAuthUser, toPublicUser } from '../auth/user.js';
export type { AuthUser, PublicUser } from '../auth/user.js';
