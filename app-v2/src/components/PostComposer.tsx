"use client";
import { useActionState, useState } from "react";
import type { Platform } from "@prisma/client";
import clsx from "clsx";
import { savePost } from "@/app/actions";
import { PLATFORMS } from "@/lib/platforms";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

type Account = { id: string; platform: Platform; handle: string };
type Mode = "now" | "schedule" | "draft";

export function PostComposer({ accounts, initial, timezone, minDate }: {
  accounts: Account[];
  timezone: string;
  minDate: string;
  initial?: { id: string; content: string; mediaUrl: string; accountIds: string[]; scheduledAt: string; mode: Mode };
}) {
  const [state, action] = useActionState(savePost, undefined);
  const v = state?.values ?? {};
  const [content, setContent] = useState(initial?.content ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.accountIds ?? []);
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "schedule");

  const chosen = accounts.filter((a) => selected.includes(a.id));
  const limits = [...new Set(chosen.map((a) => a.platform))].map((p) => ({ platform: p, max: PLATFORMS[p].maxLength }));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="content">Texto</label>
          <textarea id="content" name="content" rows={8} className="input resize-y" value={content} onChange={(e) => setContent(e.target.value)} placeholder="¿Qué quieres compartir?" />
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>{content.length} caracteres</span>
            {limits.map((l) => (
              <span key={l.platform} className={clsx(content.length > l.max && "font-medium text-red-700")}>
                {PLATFORMS[l.platform].label}: máx. {l.max.toLocaleString("es")}
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="mediaUrl">URL de imagen o video (opcional)</label>
          <input id="mediaUrl" name="mediaUrl" type="url" className="input" defaultValue={v.mediaUrl ?? initial?.mediaUrl} placeholder="https://..." />
          <p className="mt-1 text-xs text-slate-500">Instagram, TikTok y YouTube necesitan imagen o video para publicar de verdad.</p>
        </div>
      </div>

      <div className="space-y-4">
        <fieldset className="card">
          <legend className="sr-only">Redes</legend>
          <p className="label">Publicar en</p>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500">No hay redes conectadas. <a href="/accounts" className="text-brand-600 hover:underline">Conecta una</a>.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <label key={a.id} className={clsx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm", selected.includes(a.id) ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50")}>
                  <input type="checkbox" name="accountIds" value={a.id} checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="accent-brand-600" />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORMS[a.platform].color }} aria-hidden />
                  <span className="font-medium">{PLATFORMS[a.platform].label}</span>
                  <span className="truncate text-slate-500">@{a.handle}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="card space-y-3">
          <legend className="sr-only">Cuándo</legend>
          <p className="label">Cuándo</p>
          {([["now", "Publicar ahora"], ["schedule", "Programar"], ["draft", "Guardar como borrador"]] as const).map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="accent-brand-600" />
              {label}
            </label>
          ))}
          {mode === "schedule" && (
            <div>
              <input type="datetime-local" name="scheduledAt" className="input" min={minDate} defaultValue={v.scheduledAt ?? (initial?.scheduledAt || undefined)} required />
              <p className="mt-1 text-xs text-slate-500">Hora de {timezone}</p>
            </div>
          )}
          <FormError message={state?.error} />
          <SubmitButton className="btn-primary w-full" pendingText={mode === "now" ? "Publicando..." : "Guardando..."}>
            {mode === "now" ? "Publicar ahora" : mode === "schedule" ? "Programar publicación" : "Guardar borrador"}
          </SubmitButton>
        </fieldset>
      </div>
    </form>
  );
}
