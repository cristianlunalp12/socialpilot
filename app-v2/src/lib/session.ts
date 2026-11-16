import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "sp_session";
const WORKSPACE_COOKIE = "sp_workspace";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("Falta AUTH_SECRET (mínimo 16 caracteres) en las variables de entorno.");
  return new TextEncoder().encode(s);
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions);
}

export async function readSession(): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  c.delete(WORKSPACE_COOKIE);
}

export async function getActiveWorkspaceId() {
  return (await cookies()).get(WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceId(id: string) {
  (await cookies()).set(WORKSPACE_COOKIE, id, cookieOptions);
}
