import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui";
import { Composer } from "@/components/Composer";

export default async function NewPost() {
  const { workspace } = await requireWorkspace("EDITOR");
  const accounts = await db.socialAccount.findMany({
    where: { workspaceId: workspace.id, status: "active" },
    select: { id: true, platform: true, name: true }, orderBy: { platform: "asc" },
  });
  return (
    <>
      <PageHeader title="Crear publicación" subtitle="Escribe una vez, adapta por red y programa." />
      <Composer accounts={accounts} aiEnabled={env.aiEnabled} />
    </>
  );
}
