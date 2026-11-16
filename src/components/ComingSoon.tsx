"use client";

import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { recordInterest } from "@/app/actions";
import { UPCOMING, type UpcomingFeature } from "@/lib/upcoming";
import { useViewer } from "./ViewerContext";

/**
 * Looks like a normal button, but opens a "coming soon with subscription" modal
 * and records the click (and optional "notify me") for demand analytics.
 */
export function ComingSoon({ feature, children, className, badge = true }: {
  feature: UpcomingFeature; children: React.ReactNode; className?: string; badge?: boolean;
}) {
  const f = UPCOMING[feature];
  const [open, setOpen] = useState(false);
  const [notified, setNotified] = useState(false);
  const [pending, start] = useTransition();
  const viewer = useViewer();
  const [email, setEmail] = useState(viewer.isDemo ? "" : viewer.email);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={clsx(className ?? "btn-secondary")}
        onClick={() => { setOpen(true); recordInterest(feature).catch(() => {}); }}>
        {children}
        {badge && <span className="rounded-full bg-gradient-to-r from-[#ff7a85] to-[#8b5cf6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{f.plan}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`cs-${feature}`} className="ui-dark relative w-full max-w-md overflow-hidden rounded-3xl border border-violet-400/30 bg-[#12111c] p-6 text-left shadow-[0_0_80px_-20px_rgba(139,92,246,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">🚀 Próximamente · Plan {f.plan}</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">✕</button>
            </div>
            <h2 id={`cs-${feature}`} className="font-display text-xl font-semibold text-white">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.description}</p>
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-600">
              Esta función estará disponible muy pronto con la <b>suscripción {f.plan}</b>. ¿Quieres que te avisemos cuando esté lista?
            </p>
            {notified ? (
              <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">✓ ¡Listo! Te avisaremos en cuanto esté disponible.</p>
            ) : (
              <form className="mt-5 space-y-3" onSubmit={(e) => {
                e.preventDefault(); setError(null);
                start(async () => {
                  const r = await recordInterest(feature, email).catch(() => ({ error: "No se pudo guardar, intenta de nuevo." }));
                  if (r && "error" in r && r.error) setError(r.error); else setNotified(true);
                });
              }}>
                <div>
                  <label htmlFor={`cs-email-${feature}`} className="label">Tu email</label>
                  <input id={`cs-email-${feature}`} type="email" required className="input" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)}>Ahora no</button>
                  <button className="btn-primary flex-1" disabled={pending}>{pending ? "..." : "Avisarme"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
