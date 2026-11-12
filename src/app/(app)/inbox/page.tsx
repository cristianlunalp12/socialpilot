import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Prisma } from "@prisma/client";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader, PlatformBadge, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { syncNow } from "@/app/actions";

const FILTERS: [string, string][] = [["", "Todos"], ["reply", "Requieren respuesta"], ["NEGATIVE", "Negativos"], ["POSITIVE", "Positivos"], ["pending", "Sin analizar"]];

export default async function Inbox({ searchParams }: { searchParams: Promise<{ filter?: string; topic?: string }> }) {
  const { workspace } = await requireWorkspace();
  const { filter = "", topic } = await searchParams;
  const where: Prisma.CommentWhereInput = { target: { post: { workspaceId: workspace.id } } };
  if (filter === "reply") where.needsReply = true;
  if (filter === "NEGATIVE" || filter === "POSITIVE") where.sentiment = filter;
  if (filter === "pending") where.analyzedAt = null;
  if (topic) where.topics = { has: topic };

  const comments = await db.comment.findMany({
    where, orderBy: { postedAt: "desc" }, take: 200,
    include: { target: { include: { account: { select: { platform: true, name: true } }, post: { select: { id: true } } } } },
  });

  return (
    <>
      <PageHeader title="Retroalimentación" subtitle="Comentarios de todas tus redes, clasificados por IA (sentimiento, temas y si requieren respuesta)."
        actions={<ActionButton action={syncNow} label="Sincronizar y analizar" pendingLabel="Procesando..." />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([v, l]) => <Link key={v} href={v ? `?filter=${v}` : "/inbox"} className={filter === v && !topic ? "btn-primary" : "btn-secondary"}>{l}</Link>)}
        {topic && <span className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">Tema: {topic} <Link href="/inbox" className="ml-1">✕</Link></span>}
      </div>
      {comments.length === 0 ? <Empty>No hay comentarios para este filtro.</Empty> : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {comments.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <PlatformBadge platform={c.target.account.platform} />
                  <b className="text-slate-700">{c.authorName}</b>
                  <span>{formatDistanceToNow(c.postedAt, { locale: es, addSuffix: true })}</span>
                  {c.sentiment && <StatusBadge status={c.sentiment} />}
                  {c.needsReply && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Responder</span>}
                  {c.topics.map((t) => <Link key={t} href={`?topic=${encodeURIComponent(t)}`} className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200">#{t}</Link>)}
                </div>
                <p className="mt-1.5 text-sm">{c.text}</p>
                <div className="mt-1 flex gap-3 text-xs">
                  <Link href={`/posts/${c.target.post.id}`} className="text-brand-600">Ver publicación</Link>
                  {c.target.permalink && <a href={c.target.permalink} target="_blank" className="text-brand-600">Responder en la red ↗</a>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
