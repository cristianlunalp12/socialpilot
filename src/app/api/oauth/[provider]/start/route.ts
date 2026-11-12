import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/auth";
import { signState } from "@/lib/session";
import { adapterFor, redirectUriFor, type Provider } from "@/lib/platforms";

const PROVIDERS: Provider[] = ["meta", "tiktok", "youtube"];

export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as Provider)) return new NextResponse("Unknown provider", { status: 404 });
  const { workspace, user } = await requireWorkspace("ADMIN");
  const state = await signState({ workspaceId: workspace.id, userId: user.id, provider });
  const url = adapterFor(provider as Provider).authUrl(state, redirectUriFor(provider as Provider));
  return new NextResponse(null, { status: 303, headers: { Location: url } });
}
