"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";

/** Button bound to a no-arg server action that returns a FormState message. */
export function ActionButton({ action, label, pendingLabel, variant = "secondary" }: {
  action: () => Promise<FormState>; label: string; pendingLabel?: string; variant?: "primary" | "secondary";
}) {
  const [state, run, pending] = useActionState<FormState>(action, undefined);
  return (
    <form action={run} className="flex flex-col items-end gap-1">
      <button className={variant === "primary" ? "btn-primary" : "btn-secondary"} disabled={pending}>{pending ? pendingLabel ?? "..." : label}</button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state?.ok && <span className="text-xs text-emerald-600">{state.ok}</span>}
    </form>
  );
}
