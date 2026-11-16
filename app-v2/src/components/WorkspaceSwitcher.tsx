"use client";
import { switchWorkspace } from "@/app/actions";

export function WorkspaceSwitcher({ current, options }: { current: string; options: { id: string; name: string }[] }) {
  if (options.length < 2) return <p className="truncate text-sm font-semibold text-slate-900">{options[0]?.name}</p>;
  return (
    <form action={switchWorkspace}>
      <label className="sr-only" htmlFor="ws">Workspace</label>
      <select id="ws" name="workspaceId" defaultValue={current} className="input py-1.5 font-semibold" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </form>
  );
}
