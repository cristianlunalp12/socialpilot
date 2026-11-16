"use client";
import { useActionState } from "react";
import { login, register } from "@/app/actions";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next, email }: { next?: string; email?: string }) {
  const [state, action] = useActionState(login, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Correo</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={v.email ?? email} />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn-primary w-full" pendingText="Entrando...">Entrar</SubmitButton>
    </form>
  );
}

export function RegisterForm({ next, email }: { next?: string; email?: string }) {
  const [state, action] = useActionState(register, undefined);
  const v = state?.values ?? {};
  const invited = next?.startsWith("/invite/");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="name">Tu nombre</label>
        <input className="input" id="name" name="name" required autoComplete="name" defaultValue={v.name} />
      </div>
      <div>
        <label className="label" htmlFor="email">Correo</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={v.email ?? email} />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
      </div>
      {!invited && (
        <div>
          <label className="label" htmlFor="workspace">Nombre de tu marca o empresa</label>
          <input className="input" id="workspace" name="workspace" placeholder="Ej. Café Aurora" defaultValue={v.workspace} />
        </div>
      )}
      <FormError message={state?.error} />
      <SubmitButton className="btn-primary w-full" pendingText="Creando cuenta...">Crear cuenta</SubmitButton>
    </form>
  );
}
