"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/dashboard", label: "Estadísticas" },
  { href: "/posts", label: "Publicaciones" },
  { href: "/calendar", label: "Calendario" },
  { href: "/accounts", label: "Redes conectadas" },
  { href: "/settings", label: "Configuración" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={clsx(
            "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
            path.startsWith(l.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
