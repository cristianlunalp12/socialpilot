"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Platform } from "@prisma/client";
import clsx from "clsx";
import { aiGenerateCopy, savePost } from "@/app/actions";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/utils";

type Account = { id: string; platform: Platform; name: string };
const LIMITS: Record<Platform, number> = { FACEBOOK: 63206, INSTAGRAM: 2200, TIKTOK: 2200, YOUTUBE: 5000 };

export function Composer({ accounts, aiEnabled }: { accounts: Account[]; aiEnabled: boolean }) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [baseCaption, setBase] = useState("");
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [mediaUrl, setMediaUrl] = useState("");
  const [tags, setTags] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({}); // accountId -> caption
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"now" | "schedule" | "draft">("schedule");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();
  const [savePending, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);

  const toggle = (a: Account) => setSelected((s) => {
    const n = { ...s };
    if (a.id in n) delete n[a.id]; else n[a.id] = baseCaption;
    return n;
  });
  const selectedAccounts = accounts.filter((a) => a.id in selected);

  function applyBase(v: string) {
    // Keep per-account captions in sync with the base text until the user customizes them.
    setSelected((s) => Object.fromEntries(Object.entries(s).map(([id, c]) => [id, c === baseCaption ? v : c])));
    setBase(v);
  }

  function generate() {
    setError(null);
    startAi(async () => {
      const r = await aiGenerateCopy({ brief: brief || baseCaption, platforms: selectedAccounts.map((a) => a.platform) });
      if ("error" in r && r.error) return setError(r.error);
      if (!("variants" in r) || !r.variants) return;
      const byP = new Map(r.variants.map((v) => [v.platform, v]));
      setSelected((s) => Object.fromEntries(Object.entries(s).map(([id, c]) => {
        const acc = accounts.find((a) => a.id === id)!;
        return [id, byP.get(acc.platform)?.caption ?? c];
      })));
      setRationale(Object.fromEntries(selectedAccounts.map((a) => [a.id, byP.get(a.platform)?.rationale ?? ""])));
      const yt = byP.get("YOUTUBE");
      if (yt?.title) setTitle(yt.title);
      if (!baseCaption && r.variants[0]) setBase(r.variants[0].caption);
    });
  }

  async function upload(file: File) {
    setUploading(true); setError(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await res.json();
    setUploading(false);
    if (!res.ok) return setError(j.error);
    setMediaUrl(j.url); setMediaType(j.mediaType);
  }

  function submit() {
    setError(null);
    startSave(async () => {
      const r = await savePost({
        title, baseCaption: baseCaption || Object.values(selected)[0] || "", mediaType, mediaUrl, mode,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        targets: Object.entries(selected).map(([accountId, caption]) => ({ accountId, caption })),
      });
      if (r.error) setError(r.error); else router.push(`/posts/${r.id}`);
    });
  }

  if (accounts.length === 0) {
    return <div className="card text-sm">Primero conecta al menos una cuenta en <a className="text-brand-600" href="/settings">Configuración</a>.</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <section className="card space-y-4">
          <h2 className="font-medium">1 · ¿Dónde publicar?</h2>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button key={a.id} type="button" onClick={() => toggle(a)}
                className={clsx("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", a.id in selected ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600")}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[a.platform] }} />
                {PLATFORM_LABEL[a.platform]} · {a.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-medium">2 · Contenido</h2>
          <div>
            <label className="label">Brief para la IA <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea className="input" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)}
              placeholder="Ej: Lanzamos el nuevo blend 'Cusco' este viernes, notas de chocolate y frutos rojos. 15% de descuento con código CUSCO15 hasta el domingo." />
            <div className="mt-2 flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={generate} disabled={!aiEnabled || aiPending || selectedAccounts.length === 0 || !(brief || baseCaption)}>
                {aiPending ? "Generando..." : "✨ Generar y adaptar copys por red"}
              </button>
              {!aiEnabled && <span className="text-xs text-slate-400">Configura ANTHROPIC_API_KEY para activar la IA</span>}
            </div>
          </div>
          <div>
            <label className="label">Texto base</label>
            <textarea className="input" rows={4} value={baseCaption} onChange={(e) => applyBase(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Formato</label>
              <select className="input" value={mediaType} onChange={(e) => setMediaType(e.target.value as typeof mediaType)}>
                <option value="TEXT">Solo texto</option><option value="IMAGE">Imagen</option><option value="VIDEO">Video</option>
              </select>
            </div>
            {mediaType !== "TEXT" && (
              <div className="sm:col-span-2">
                <label className="label">Archivo (URL pública o subir)</label>
                <div className="flex gap-2">
                  <input className="input" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." />
                  <label className="btn-secondary cursor-pointer whitespace-nowrap">
                    {uploading ? "Subiendo..." : "Subir"}
                    <input type="file" hidden accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                </div>
              </div>
            )}
          </div>
          {selectedAccounts.some((a) => a.platform === "YOUTUBE") && (
            <div><label className="label">Título (YouTube)</label><input className="input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          )}
          <div><label className="label">Etiquetas internas / tags <span className="font-normal text-slate-400">(separadas por coma)</span></label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="lanzamiento, promo" /></div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-medium">3 · Cuándo</h2>
          <div className="flex flex-wrap gap-2">
            {([["now", "Publicar ahora"], ["schedule", "Programar"], ["draft", "Guardar borrador"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMode(v)} className={mode === v ? "btn-primary" : "btn-secondary"}>{l}</button>
            ))}
          </div>
          {mode === "schedule" && <input type="datetime-local" className="input max-w-xs" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" className="btn-primary w-full" onClick={submit} disabled={savePending || selectedAccounts.length === 0}>
            {savePending ? "Guardando..." : mode === "now" ? "Publicar" : mode === "schedule" ? "Programar publicación" : "Guardar"}
          </button>
        </section>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <h2 className="font-medium">Vista previa por red</h2>
        {selectedAccounts.length === 0 && <p className="text-sm text-slate-500">Elige cuentas para ver y ajustar el texto de cada una.</p>}
        {selectedAccounts.map((a) => {
          const c = selected[a.id] ?? "";
          return (
            <div key={a.id} className="card space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[a.platform] }} />{PLATFORM_LABEL[a.platform]} · {a.name}</span>
                <span className={clsx("text-xs", c.length > LIMITS[a.platform] ? "text-red-600" : "text-slate-400")}>{c.length}/{LIMITS[a.platform]}</span>
              </div>
              {mediaUrl && mediaType === "IMAGE" && <img src={mediaUrl} alt="" className="max-h-48 w-full rounded-lg object-cover" />}
              <textarea className="input" rows={6} value={c} onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.value }))} />
              {rationale[a.id] && <p className="text-xs text-slate-500">💡 {rationale[a.id]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
