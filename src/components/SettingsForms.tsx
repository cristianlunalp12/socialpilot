"use client";

import { useActionState } from "react";
import { inviteMember, updateWorkspace, type FormState } from "@/app/actions";

export function WorkspaceSettingsForm({ name, brandVoice, disabled }: { name: string; brandVoice: string; disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateWorkspace, undefined);
  return (
    <form action={action} className="space-y-3">
      <div><label className="label">Nombre</label><input name="name" className="input" defaultValue={name} disabled={disabled} /></div>
      <div><label className="label">Voz de marca y audiencia</label><textarea name="brandVoice" rows={4} className="input" defaultValue={brandVoice} disabled={disabled} /></div>
      {!disabled && <button className="btn-primary" disabled={pending}>Guardar</button>}
      {state?.ok && <span className="ml-3 text-sm text-emerald-600">{state.ok}</span>}
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteMember, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input name="email" type="email" placeholder="email@empresa.com" className="input max-w-xs" required />
        <select name="role" className="input w-auto" defaultValue="EDITOR">
          <option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="VIEWER">Solo lectura</option>
        </select>
        <button className="btn-primary" disabled={pending}>Invitar</button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="break-all text-sm text-emerald-700">Enlace de invitación (válido 7 días): <code>{state.ok}</code></p>}
    </form>
  );
}
