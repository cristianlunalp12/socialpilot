import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MIME, uploadDir } from "@/lib/uploads";

// Public on purpose: Instagram / TikTok / YouTube must be able to download the media.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[\w-]+\.[a-z0-9]+$/i.test(file)) return new Response("Not found", { status: 404 });
  const full = path.join(uploadDir(), file);
  try {
    const info = await stat(full);
    const ext = file.split(".").pop()!.toLowerCase();
    return new Response(Readable.toWeb(createReadStream(full)) as ReadableStream, {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Content-Length": String(info.size), "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
