import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePost, retryPost } from "@/app/actions";
import { PlatformBadge, StatusBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { PostComposer } from "@/components/PostComposer";
import { SubmitButton } from "@/components/SubmitButton";
import { can, requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, utcToZonedInput } from "@/lib/dates";
import { number } from "@/lib/format";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace, role } = await requireWorkspace();
  const post = await db.post.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { targets: { include: { account: true } }, author: { select: { name: true } } },
  });
  if (!post) notFound();

  const tz = workspace.timezone;
  const editor = can(role, "EDITOR");
  const editable = editor && ["DRAFT", "SCHEDULED", "FAILED"].includes(post.status) && !post.targets.some((t) => t.status === "PUBLISHED");

  if (editable) {
    const accounts = await db.socialAccount.findMany({ where: { workspaceId: workspace.id, disconnectedAt: null }, orderBy: { platform: "asc" } });
    const now = utcToZonedInput(new Date(), tz);
    const scheduled = post.scheduledAt && post.scheduledAt > new Date() ? utcToZonedInput(post.scheduledAt, tz) : "";
    return (
      <>
        <PageHeader
          title={post.status === "DRAFT" ? "Editar borrador" : "Editar publicación"}
          description={`Creada por ${post.author.name}`}
          actions={
            <form action={deletePost}>
              <input type="hidden" name="id" value={post.id} />
              <SubmitButton className="btn-danger" pendingText="Eliminando...">Eliminar</SubmitButton>
            </form>
          }
        />
        {post.status === "FAILED" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudo publicar: {post.targets.map((t) => t.error).filter(Boolean).join(" · ") || "error desconocido"}. Revisa y vuelve a enviarla.
          </div>
        )}
        <PostComposer
          accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle }))}
          timezone={tz}
          minDate={now}
          initial={{
            id: post.id, content: post.content, mediaUrl: post.mediaUrl ?? "",
            accountIds: post.targets.map((t) => t.accountId), scheduledAt: scheduled,
            mode: post.status === "DRAFT" ? "draft" : "schedule",
          }}
        />
      </>
    );
  }

  const hasFailed = post.targets.some((t) => t.status === "FAILED");
  return (
    <>
      <PageHeader
        title="Publicación"
        description={`Creada por ${post.author.name}${post.publishedAt ? ` · publicada el ${formatDateTime(post.publishedAt, tz)}` : ""}`}
        actions={
          <>
            <Link href="/posts" className="btn-secondary">Volver</Link>
            {editor && hasFailed && post.status !== "PUBLISHING" && (
              <form action={retryPost}>
                <input type="hidden" name="id" value={post.id} />
                <SubmitButton className="btn-primary" pendingText="Reintentando...">Reintentar las que fallaron</SubmitButton>
              </form>
            )}
          </>
        }
      />
      <div className="card">
        <StatusBadge status={post.status} />
        <p className="mt-3 whitespace-pre-wrap text-sm">{post.content}</p>
        {post.mediaUrl && <a href={post.mediaUrl} className="mt-2 block truncate text-sm text-brand-600 hover:underline" target="_blank" rel="noreferrer">{post.mediaUrl}</a>}
      </div>

      <h2 className="mb-3 mt-6 font-semibold">Resultados por red</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {post.targets.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <PlatformBadge platform={t.account.platform} handle={t.account.handle} />
              <span className="text-xs text-slate-500">
                {t.status === "PUBLISHED" ? "Publicada" : t.status === "FAILED" ? `Falló tras ${t.attempts} intentos` : t.attempts ? `Reintentando (${t.attempts})` : "Pendiente"}
              </span>
            </div>
            {t.error && t.status !== "PUBLISHED" && <p className="mt-2 text-sm text-red-700">{t.error}</p>}
            {t.status === "PUBLISHED" && (
              <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                {([["Vistas", t.views], ["Me gusta", t.likes], ["Comentarios", t.comments], ["Compartidos", t.shares]] as const).map(([label, v]) => (
                  <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="text-lg font-semibold tabular-nums">{number(v)}</dd></div>
                ))}
              </dl>
            )}
            {t.metricsAt && <p className="mt-3 text-xs text-slate-400">Métricas actualizadas: {formatDateTime(t.metricsAt, tz)}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
