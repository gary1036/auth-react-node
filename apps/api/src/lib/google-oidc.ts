import * as client from 'openid-client';
import { Role, UserStatus } from '../auth/roles.js';
import { toAuthUser, toPublicUser, usernameFromEmail } from '../auth/user.js';
import { assertGoogleOidcConfigured, type Env } from '../config/env.js';
import { prisma } from './prisma.js';
import { issueTokenPair } from './tokens.js';

const GOOGLE_ISSUER = new URL('https://accounts.google.com');

let googleConfig: client.Configuration | null = null;

export async function getGoogleOidcConfig(env: Env): Promise<client.Configuration> {
  assertGoogleOidcConfigured(env);
  if (googleConfig) return googleConfig;

  googleConfig = await client.discovery(
    GOOGLE_ISSUER,
    env.GOOGLE_CLIENT_ID,
    {
      client_secret: env.GOOGLE_CLIENT_SECRET,
    },
    client.ClientSecretPost(env.GOOGLE_CLIENT_SECRET),
  );

  return googleConfig;
}

export function resetGoogleOidcConfig() {
  googleConfig = null;
}

export async function createGoogleAuthorizationRequest(env: Env) {
  const config = await getGoogleOidcConfig(env);
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const parameters: Record<string, string> = {
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'online',
    prompt: 'select_account',
  };

  const redirectTo = client.buildAuthorizationUrl(config, parameters);

  await prisma.oAuthState.create({
    data: {
      state,
      codeVerifier,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return { authorizeUrl: redirectTo.href, state };
}

export async function handleGoogleOidcCallback(env: Env, callbackUrl: URL) {
  const state = callbackUrl.searchParams.get('state');
  if (!state) {
    throw new Error('Missing OAuth state');
  }

  const stored = await prisma.oAuthState.findUnique({ where: { state } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.oAuthState.delete({ where: { id: stored.id } });
    }
    throw new Error('Invalid or expired OAuth state');
  }

  await prisma.oAuthState.delete({ where: { id: stored.id } });

  const config = await getGoogleOidcConfig(env);
  const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: stored.codeVerifier,
    expectedState: state,
    idTokenExpected: true,
  });

  const claims = tokens.claims();
  if (!claims?.sub) {
    throw new Error('Google ID token missing subject');
  }

  const email =
    typeof claims.email === 'string' ? claims.email.toLowerCase() : `${claims.sub}@google.local`;
  const name =
    typeof claims.name === 'string'
      ? claims.name
      : typeof claims.given_name === 'string'
        ? claims.given_name
        : null;

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleSub: claims.sub }, { email }],
    },
  });

  if (!user) {
    const base = usernameFromEmail(email);
    let username = base;
    let i = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      i += 1;
      username = `${base}${i}`.slice(0, 40);
    }

    user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        googleSub: claims.sub,
        role: Role.USER,
        status: UserStatus.ACTIVE,
      },
    });
  } else if (!user.googleSub) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleSub: claims.sub,
        name: user.name ?? name,
      },
    });
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('Account is inactive');
  }

  const authUser = toAuthUser(user);
  const tokenPair = await issueTokenPair(env, authUser);
  return {
    user: toPublicUser(user),
    ...tokenPair,
  };
}
