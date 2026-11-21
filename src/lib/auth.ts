import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';

export const SESSION_COOKIE_NAME = 'kairos_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'kairos';
const JWT_AUDIENCE = 'kairos-app';

export interface SessionPayload {
  userId: string;
}

/**
 * Reads AUTH_SECRET lazily so that importing this module never throws
 * during `next build`. Returns null when the secret is not configured.
 */
function getSecretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates a stateless signed JWT for the given user id.
 * The token is returned so the caller can both set the httpOnly cookie
 * and include it in the JSON body (dual delivery).
 */
export async function createSessionToken(userId: string): Promise<string> {
  const key = getSecretKey();
  if (!key) {
    throw new Error('AUTH_SECRET is not configured (must be at least 32 characters)');
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/**
 * Verifies a session JWT. Returns the payload, or null when the token is
 * missing, malformed, expired, or signed with a different secret.
 */
export async function verifySessionToken(token: string | null | undefined): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const key = getSecretKey();
  if (!key) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Extracts a bearer token from an Authorization header value.
 */
export function extractBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : null;
}

/**
 * Reads a named cookie from a raw Cookie header value.
 */
function readCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    if (key === name) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return null;
}

/**
 * Pulls the session token from a Request. The Authorization header is
 * preferred; the httpOnly cookie is the fallback.
 */
export function getTokenFromRequest(request: Request): string | null {
  const fromHeader = extractBearerToken(request.headers.get('authorization'));
  if (fromHeader) {
    return fromHeader;
  }
  return readCookieFromHeader(request.headers.get('cookie'), SESSION_COOKIE_NAME);
}

/**
 * Resolves the authenticated user id for a route handler.
 * Returns null when there is no valid session (route should answer 401).
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const token = getTokenFromRequest(request);
  const session = await verifySessionToken(token);
  return session ? session.userId : null;
}

/**
 * Resolves the authenticated user id for Server Components and server
 * pages, reading the Authorization header and the session cookie.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const headerStore = await headers();
  const fromHeader = extractBearerToken(headerStore.get('authorization'));
  if (fromHeader) {
    const session = await verifySessionToken(fromHeader);
    if (session) {
      return session.userId;
    }
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const session = await verifySessionToken(cookieToken);
  return session ? session.userId : null;
}

/**
 * Sets the httpOnly session cookie on the current response.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Clears the session cookie (logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}