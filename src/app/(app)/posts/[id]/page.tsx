import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { requireWorkspace, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt, pct } from "@/lib/utils";
import { Card, PageHeader, PlatformBadge, StatusBadge } from "@/components/ui";
import { MetricHistory } from "@/components/Charts";
import { deletePost, retryPost } from "@/app/actions";

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace, role } = await requireWorkspace();
  const post = await db.post.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      author: { select: { name: true } },
      targets: {
        include: {
          account: true,
          metrics: { orderBy: { capturedAt: "asc" } },
          comments: { orderBy: { postedAt: "desc" }, take: 20 },
        },
      },
    },
  });
  if (!post) notFound();
  const editable = can(role, "EDITOR");

  return (
    <>
      <PageHeader
        title={post.title || "Publicación"}
        subtitle={`${post.author.name} · ${post.scheduledAt ? `programada ${format(post.scheduledAt, "d MMM yyyy HH:mm", { locale: es })}` : `creada ${format(post.createdAt, "d MMM yyyy HH:mm", { locale: es })}`}`}
        actions={editable && <>
          {["FAILED", "PARTIAL"].includes(post.status) && <form action={retryPost}><input type="hidden" name="postId" value={post.id} /><button className="btn-primary">Reintentar fallidos</button></form>}
          {["DRAFT", "SCHEDULED", "FAILED"].includes(post.status) && <form action={deletePost}><input type="hidden" name="postId" value={post.id} /><button className="btn-danger">Eliminar</button></form>}
        </>}
      />
      <div className="mb-6 flex items-center gap-3"><StatusBadge status={post.status} />
        {post.mediaUrl && <a href={post.mediaUrl} target="_blank" className="text-sm text-brand-600">Ver multimedia ↗</a>}</div>

      <div className="space-y-6">
        {post.targets.map((t) => {
          const last = t.metrics.at(-1);
          const eng = last ? last.likes + last.comments + last.shares + last.saves : 0;
          return (
            <Card key={t.id}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><PlatformBadge platform={t.account.platform} /><span className="text-sm font-medium">{t.account.name}</span><StatusBadge status={t.status} /></div>
                {t.permalink && <a href={t.permalink} target="_blank" className="text-sm text-brand-600">Abrir en la red ↗</a>}
              </div>
              {t.error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{t.error}</p>}
              <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{t.caption}</p>
              {last && (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-3 text-center text-sm sm:grid-cols-6">
                    {[["Vistas", last.views], ["Alcance", last.reach], ["Likes", last.likes], ["Comentarios", last.comments], ["Compartidos", last.shares], ["Guardados", last.saves]].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg bg-slate-50 p-2"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold tabular-nums">{fmt.format(v as number)}</div></div>
                    ))}
                  </div>
                  <p className="mb-2 text-xs text-slate-500">Engagement rate: <b>{pct(eng / Math.max(last.reach, last.views, 1))}</b>{last.watchTimeSec ? ` · Tiempo de visualización: ${fmt.format(last.watchTimeSec / 3600)} h` : ""}</p>
                  {t.metrics.length > 1 && <MetricHistory data={t.metrics.map((m) => ({ t: format(m.capturedAt, "dd/MM HH:mm"), views: m.views, likes: m.likes, comments: m.comments, shares: m.shares }))} />}
                </>
              )}
              {t.comments.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <h3 className="mb-2 text-sm font-medium">Comentarios recientes</h3>
                  <ul className="space-y-2">
                    {t.comments.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
                        <span><b className="font-medium">{c.authorName}:</b> {c.text}</span>
                        {c.sentiment && <StatusBadge status={c.sentiment} />}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
