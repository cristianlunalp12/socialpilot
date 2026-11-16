import Link from "next/link";
import clsx from "clsx";
import type { PostStatus, Prisma } from "@prisma/client";
import { PlatformBadge, StatusBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { can, requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

const TABS: { key: string; label: string; where: Prisma.PostWhereInput; order: Prisma.PostOrderByWithRelationInput }[] = [
  { key: "scheduled", label: "Programadas", where: { status: { in: ["SCHEDULED", "PUBLISHING"] } }, order: { scheduledAt: "asc" } },
  { key: "published", label: "Publicadas", where: { status: { in: ["PUBLISHED", "PARTIAL"] } }, order: { publishedAt: "desc" } },
  { key: "drafts", label: "Borradores", where: { status: "DRAFT" }, order: { updatedAt: "desc" } },
  { key: "failed", label: "Con errores", where: { status: { in: ["FAILED", "PARTIAL"] as PostStatus[] } }, order: { updatedAt: "desc" } },
];

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { workspace, role } = await requireWorkspace();
  const { tab: tabKey } = await searchParams;
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  const [posts, counts] = await Promise.all([
    db.post.findMany({
      where: { workspaceId: workspace.id, ...tab.where },
      orderBy: tab.order,
      take: 100,
      include: { targets: { include: { account: { select: { platform: true, handle: true } } } }, author: { select: { name: true } } },
    }),
    Promise.all(TABS.map((t) => db.post.count({ where: { workspaceId: workspace.id, ...t.where } }))),
  ]);

  return (
    <>
      <PageHeader title="Publicaciones" actions={can(role, "EDITOR") && <Link href="/posts/new" className="btn-primary">Nueva publicación</Link>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t, i) => (
          <Link key={t.key} href={`/posts?tab=${t.key}`} className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", t.key === tab.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {t.label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{counts[i]}</span>
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">No hay publicaciones aquí todavía.</div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const when = p.publishedAt ?? p.scheduledAt;
            return (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="card block hover:border-brand-500">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <StatusBadge status={p.status} />
                    {when && <span>{formatDateTime(when, workspace.timezone)}</span>}
                    <span>· {p.author.name}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">{p.content}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.targets.map((t) => <PlatformBadge key={t.id} platform={t.account.platform} handle={t.account.handle} />)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
