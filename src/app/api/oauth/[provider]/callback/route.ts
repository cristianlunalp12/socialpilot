import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { readSession, verifyState } from "@/lib/session";
import { adapterFor, redirectUriFor, type Provider } from "@/lib/platforms";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  // Relative Location keeps the redirect on whatever host the user is browsing.
  const back = (q: string) => new NextResponse(null, { status: 303, headers: { Location: `/settings?${q}` } });
  const code = req.nextUrl.searchParams.get("code");
  const stateTok = req.nextUrl.searchParams.get("state");
  if (!code || !stateTok) return back(`error=${encodeURIComponent(req.nextUrl.searchParams.get("error_description") ?? "Autorización cancelada")}`);

  try {
    const state = await verifyState(stateTok);
    const session = await readSession();
    if (state.provider !== provider || session?.userId !== state.userId) throw new Error("Estado OAuth inválido");
    const member = await db.membership.findUnique({ where: { userId_workspaceId: { userId: state.userId, workspaceId: state.workspaceId } } });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) throw new Error("Sin permisos");

    const accounts = await adapterFor(provider as Provider).handleCallback(code, redirectUriFor(provider as Provider));
    for (const a of accounts) {
      const data = {
        name: a.name, avatarUrl: a.avatarUrl ?? null, accessToken: encrypt(a.accessToken),
        refreshToken: a.refreshToken ? encrypt(a.refreshToken) : null, tokenExpiresAt: a.tokenExpiresAt ?? null,
        scopes: a.scopes ?? null, status: "active", lastError: null,
      };
      await db.socialAccount.upsert({
        where: { workspaceId_platform_externalId: { workspaceId: state.workspaceId, platform: a.platform, externalId: a.externalId } },
        create: { workspaceId: state.workspaceId, platform: a.platform, externalId: a.externalId, ...data },
        update: data,
      });
    }
    return back(`connected=${accounts.length}`);
  } catch (e) {
    console.error("[oauth]", e);
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : "Error de conexión")}`);
  }
}
