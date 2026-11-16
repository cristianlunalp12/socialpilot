"use client";
import { useActionState } from "react";
import { inviteMember, updateWorkspace } from "@/app/actions";
import { TIMEZONES } from "@/lib/dates";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function WorkspaceForm({ name, timezone }: { name: string; timezone: string }) {
  const [state, action] = useActionState(updateWorkspace, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_240px_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="name">Nombre</label>
        <input id="name" name="name" className="input" defaultValue={v.name ?? name} required />
      </div>
      <div>
        <label className="label" htmlFor="timezone">Zona horaria</label>
        <select id="timezone" name="timezone" className="input" defaultValue={v.timezone ?? timezone}>
          {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <SubmitButton>Guardar</SubmitButton>
      <div className="sm:col-span-3">
        <FormError message={state?.error} />
        {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="invite-email">Correo</label>
        <input id="invite-email" name="email" type="email" className="input" required placeholder="persona@empresa.com" defaultValue={v.email} />
      </div>
      <div>
        <label className="label" htmlFor="invite-role">Rol</label>
        <select id="invite-role" name="role" className="input" defaultValue={v.role ?? "EDITOR"}>
          <option value="ADMIN">Administrador</option>
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Lector</option>
        </select>
      </div>
      <SubmitButton pendingText="Invitando...">Invitar</SubmitButton>
      <div className="space-y-2 sm:col-span-3">
        <FormError message={state?.error} />
        {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
        {state?.link && <input readOnly value={state.link} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />}
      </div>
    </form>
  );
}
