"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ComingSoon } from "./ComingSoon";
import { Icon } from "./Brand";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/posts/new", label: "Crear publicación", icon: "pen" },
  { href: "/posts", label: "Publicaciones", icon: "stack" },
  { href: "/inbox", label: "Retroalimentación", icon: "chat" },
  { href: "/insights", label: "Recomendaciones IA", icon: "bulb" },
  { href: "/settings", label: "Configuración", icon: "gear" },
];

const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition";
const idle = "text-slate-600 hover:bg-white/5 hover:text-white";

export function SidebarNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/posts" ? path === "/posts" || /^\/posts\/(?!new)/.test(path) : path.startsWith(href));
  return (
    <nav className="space-y-1">
      {NAV.map((n) => {
        const on = active(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={clsx(
              item,
              on ? "relative bg-gradient-to-r from-violet-500/20 to-violet-500/5 font-medium text-white ring-1 ring-violet-400/25" : idle,
            )}
          >
            {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-[#ff7a85] to-[#8b5cf6]" />}
            <Icon name={n.icon} className={clsx("h-[18px] w-[18px]", on ? "text-violet-300" : "text-slate-400")} />
            {n.label}
          </Link>
        );
      })}
      <ComingSoon feature="calendar" className={clsx(item, idle)}>
        <Icon name="calendar" className="h-[18px] w-[18px] text-slate-400" />
        <span className="flex-1">Calendario</span>
      </ComingSoon>
      <ComingSoon feature="competitors" className={clsx(item, idle)}>
        <Icon name="search" className="h-[18px] w-[18px] text-slate-400" />
        <span className="flex-1">Competencia</span>
      </ComingSoon>
    </nav>
  );
}
