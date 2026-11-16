"use client";
import { useActionState } from "react";
import { createWorkspace } from "@/app/actions";
import { TIMEZONES } from "@/lib/dates";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function NewWorkspaceForm() {
  const [state, action] = useActionState(createWorkspace, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="ws-name">Nombre</label>
        <input className="input" id="ws-name" name="name" required placeholder="Ej. Café Aurora" defaultValue={v.name} />
      </div>
      <div>
        <label className="label" htmlFor="ws-tz">Zona horaria</label>
        <select className="input" id="ws-tz" name="timezone" defaultValue={v.timezone ?? "America/Mexico_City"}>
          {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <FormError message={state?.error} />
      <SubmitButton>Crear workspace</SubmitButton>
    </form>
  );
}
