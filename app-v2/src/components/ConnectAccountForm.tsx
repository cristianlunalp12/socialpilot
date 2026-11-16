"use client";
import { useActionState } from "react";
import { connectAccount } from "@/app/actions";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function ConnectAccountForm() {
  const [state, action] = useActionState(connectAccount, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="platform">Red</label>
        <select id="platform" name="platform" className="input" defaultValue={v.platform}>
          {PLATFORM_ORDER.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="handle">Usuario</label>
        <input id="handle" name="handle" className="input" placeholder="@tumarca" required defaultValue={v.handle} />
      </div>
      <SubmitButton pendingText="Conectando...">Conectar</SubmitButton>
      <div className="sm:col-span-3">
        <FormError message={state?.error} />
        {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}
