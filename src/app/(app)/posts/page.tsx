import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PostStatus } from "@prisma/client";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader, PlatformBadge, StatusBadge } from "@/components/ui";

const FILTERS: [string, string][] = [["", "Todas"], ["SCHEDULED", "Programadas"], ["PUBLISHED", "Publicadas"], ["DRAFT", "Borradores"], ["FAILED", "Con error"]];

export default async function Posts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { workspace } = await requireWorkspace();
  const status = (await searchParams).status as PostStatus | undefined;
  const posts = await db.post.findMany({
    where: { workspaceId: workspace.id, ...(status ? { status: status === "FAILED" ? { in: ["FAILED", "PARTIAL"] } : status } : {}) },
    include: { targets: { include: { account: { select: { platform: true } } } }, author: { select: { name: true } } },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }], take: 100,
  });
  return (
    <>
      <PageHeader title="Publicaciones" actions={<Link href="/posts/new" className="btn-primary">+ Nueva</Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => <Link key={v} href={v ? `?status=${v}` : "/posts"} className={(status ?? "") === v ? "btn-primary" : "btn-secondary"}>{l}</Link>)}
      </div>
      {posts.length === 0 ? <Empty>No hay publicaciones.</Empty> : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title || p.baseCaption}</div>
                    <div className="mt-1 flex flex-wrap gap-1">{p.targets.map((t) => <PlatformBadge key={t.id} platform={t.account.platform} />)}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <StatusBadge status={p.status} />
                    <div className="mt-1">{format(p.scheduledAt ?? p.createdAt, "d MMM yyyy, HH:mm", { locale: es })} · {p.author.name}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
