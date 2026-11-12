"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/app/actions";

export function AuthForm({ mode, invite, demo }: { mode: "login" | "register"; invite?: string; demo?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? login : register, undefined);
  return (
    <form action={action} className="space-y-4">
      {invite && <input type="hidden" name="invite" value={invite} />}
      {mode === "register" && (
        <div><label className="label">Nombre</label><input name="name" className="input" required /></div>
      )}
      <div><label className="label">Email</label><input name="email" type="email" className="input" required defaultValue={demo && mode === "login" ? "demo@socialpilot.dev" : undefined} /></div>
      <div><label className="label">Contraseña</label><input name="password" type="password" className="input" required minLength={mode === "register" ? 8 : 1} defaultValue={demo && mode === "login" ? "demo12345" : undefined} /></div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
      <p className="text-center text-sm text-slate-500">
        {mode === "login"
          ? <>¿No tienes cuenta? <Link className="text-brand-600" href={`/register${invite ? `?invite=${invite}` : ""}`}>Regístrate</Link></>
          : <>¿Ya tienes cuenta? <Link className="text-brand-600" href={`/login${invite ? `?invite=${invite}` : ""}`}>Entra</Link></>}
      </p>
    </form>
  );
}
