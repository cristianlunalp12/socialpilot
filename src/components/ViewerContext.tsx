"use client";

import { createContext, useContext } from "react";

/** Minimal info about the signed-in user for client components (e.g. pre-filling the waitlist email). */
const Ctx = createContext<{ email: string; isDemo: boolean }>({ email: "", isDemo: false });
export const useViewer = () => useContext(Ctx);
export function ViewerProvider({ value, children }: { value: { email: string; isDemo: boolean }; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
