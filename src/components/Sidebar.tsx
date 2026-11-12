"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/posts/new", label: "Crear publicación", icon: "✍️" },
  { href: "/posts", label: "Publicaciones", icon: "🗂️" },
  { href: "/inbox", label: "Retroalimentación", icon: "💬" },
  { href: "/insights", label: "Recomendaciones IA", icon: "💡" },
  { href: "/settings", label: "Configuración", icon: "⚙️" },
];

export function SidebarNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/posts" ? path === "/posts" || /^\/posts\/(?!new)/.test(path) : path.startsWith(href));
  return (
    <nav className="space-y-1">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href}
          className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", active(n.href) ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100")}>
          <span aria-hidden>{n.icon}</span>{n.label}
        </Link>
      ))}
    </nav>
  );
}
