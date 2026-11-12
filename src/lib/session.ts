import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "sp_session";
const WS_COOKIE = "sp_workspace";
const secret = () => new TextEncoder().encode(env.authSecret);

export type Session = { userId: string };

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE);
  c.delete(WS_COOKIE);
}

export async function setActiveWorkspace(id: string) {
  (await cookies()).set(WS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function getActiveWorkspaceId() {
  return (await cookies()).get(WS_COOKIE)?.value ?? null;
}

// Short-lived signed state for OAuth round trips (CSRF + workspace binding).
export async function signState(data: Record<string, string>) {
  return new SignJWT(data).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(secret());
}
export async function verifyState(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as Record<string, string>;
}
