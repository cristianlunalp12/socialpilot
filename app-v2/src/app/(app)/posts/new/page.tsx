import { PageHeader } from "@/components/PageHeader";
import { PostComposer } from "@/components/PostComposer";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { utcToZonedInput } from "@/lib/dates";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { workspace } = await requireWorkspace("EDITOR");
  const { date } = await searchParams;
  const accounts = await db.socialAccount.findMany({ where: { workspaceId: workspace.id, disconnectedAt: null }, orderBy: { platform: "asc" } });
  const now = utcToZonedInput(new Date(), workspace.timezone);
  // Desde el calendario llega ?date=2026-11-20: proponemos las 10:00 de ese día.
  const scheduledAt = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && `${date}T10:00` > now ? `${date}T10:00` : "";
  return (
    <>
      <PageHeader title="Nueva publicación" />
      <PostComposer
        accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle }))}
        timezone={workspace.timezone}
        minDate={now}
        initial={scheduledAt ? { id: "", content: "", mediaUrl: "", accountIds: [], scheduledAt, mode: "schedule" } : undefined}
      />
    </>
  );
}
