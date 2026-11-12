import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { requireWorkspace } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * Dev-grade upload to /public/uploads. Instagram, TikTok and YouTube fetch media from a PUBLIC URL,
 * so in production replace this with S3/R2/GCS (and verify the domain in TikTok's developer portal).
 */
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

export async function POST(req: Request) {
  await requireWorkspace("EDITOR");
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Tipo no permitido" }, { status: 400 });
  if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: "Máximo 500 MB" }, { status: 400 });
  const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `${env.appUrl}/uploads/${name}`, mediaType: file.type.startsWith("video") ? "VIDEO" : "IMAGE" });
}
