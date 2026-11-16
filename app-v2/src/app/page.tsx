import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

const FEATURES = [
  { title: "Programa una vez, publica en todas", text: "Escribe tu publicación, elige Facebook, Instagram, TikTok o YouTube y la fecha. SocialPilot la publica a la hora indicada." },
  { title: "Calendario de contenido", text: "Ve de un vistazo qué sale cada día y detecta huecos en tu planificación." },
  { title: "Estadísticas en un solo panel", text: "Seguidores, alcance e interacción de todas tus redes, y cuáles publicaciones funcionaron mejor." },
  { title: "Trabajo en equipo", text: "Invita a tu equipo con roles de administrador, editor o lector." },
];

export default async function Home() {
  if (await getUser()) redirect("/dashboard");
  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-xl font-bold text-brand-700">SocialPilot</span>
        <div className="flex gap-2">
          <Link href="/login" className="btn-secondary">Entrar</Link>
          <Link href="/register" className="btn-primary">Crear cuenta</Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Tus redes sociales en piloto automático</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Programa publicaciones en todas tus redes desde un solo lugar y descubre qué contenido hace crecer tu marca.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Empieza gratis</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">Ya tengo cuenta</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
