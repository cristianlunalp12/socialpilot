"use client";

import { useActionState } from "react";
import { createWorkspace, type FormState } from "@/app/actions";

export function WorkspaceForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkspace, undefined);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label">Nombre de la marca o cliente</label><input name="name" className="input" required /></div>
      <div>
        <label className="label">Voz de marca y audiencia <span className="font-normal text-slate-400">(la IA lo usa como contexto)</span></label>
        <textarea name="brandVoice" rows={4} className="input" placeholder="Ej: Marca de café de especialidad en Lima. Tono cálido y experto, tuteo. Audiencia 25–40 años, urbana." />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>Crear workspace</button>
    </form>
  );
}
