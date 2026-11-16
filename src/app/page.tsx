import Link from "next/link";
import { readSession } from "@/lib/session";

export const metadata = {
  title: "SocialPilot · Tu community manager con IA",
  description:
    "Presencia digital automatizada para pequeños y medianos negocios. Contenido constante, respuestas a tu comunidad y métricas en Instagram, por mucho menos de lo que cuesta un community manager.",
};

/* Precios de referencia: ajústalos aquí cuando definas los planes finales. */
const PLANS = [
  {
    name: "Inicial",
    price: 19,
    tagline: "Para empezar a publicar con constancia.",
    features: ["1 cuenta de Instagram", "12 publicaciones al mes", "Textos y hashtags con IA", "Calendario y programación", "Métricas básicas"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: 39,
    tagline: "Para negocios que quieren crecer su comunidad.",
    features: [
      "Todo lo del plan Inicial",
      "Publicaciones ilimitadas",
      "Respuestas a comentarios con IA",
      "Análisis de sentimiento y temas",
      "Recomendaciones semanales",
      "Mejor hora de publicación",
    ],
    highlighted: true,
  },
  {
    name: "Business",
    price: 79,
    tagline: "Para varias marcas, sucursales o agencias.",
    features: ["Todo lo del plan Pro", "Hasta 5 marcas", "Equipo con roles y aprobaciones", "Reportes PDF con tu marca", "Facebook, TikTok y YouTube"],
    highlighted: false,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Conecta",
    text: "Vincula tu Instagram en un clic y cuéntanos de tu negocio: qué vendes, a quién y con qué tono hablas.",
  },
  {
    n: "02",
    title: "Publica",
    text: "La IA propone ideas, escribe los textos y programa cada publicación en el mejor horario. Tú solo apruebas.",
  },
  {
    n: "03",
    title: "Crece",
    text: "Responde a tu comunidad, entiende qué funciona y recibe cada semana recomendaciones claras para mejorar.",
  },
];

const FEATURES = [
  { icon: "calendar", title: "Calendario siempre lleno", text: "Planifica semanas de contenido en minutos. Nunca más un mes sin publicar." },
  { icon: "spark", title: "Textos con la voz de tu marca", text: "Captions, hashtags y llamados a la acción adaptados a tu negocio y a cada formato." },
  { icon: "chat", title: "Comunidad atendida", text: "Todos tus comentarios en una bandeja, con respuestas sugeridas listas para enviar." },
  { icon: "chart", title: "Métricas que se entienden", text: "Alcance, interacción y crecimiento explicados en lenguaje simple, sin hojas de cálculo." },
  { icon: "bulb", title: "Recomendaciones semanales", text: "Qué publicar, cuándo y por qué, según lo que realmente le gusta a tu audiencia." },
  { icon: "users", title: "Trabaja en equipo", text: "Invita a tu socio o a tu equipo, con roles y aprobación antes de publicar." },
];

const FAQ = [
  {
    q: "¿Necesito saber de marketing o de redes sociales?",
    a: "No. SocialPilot te guía desde el primer día: te propone ideas, escribe los textos y te dice cuándo publicar. Tú decides qué sale y qué no.",
  },
  {
    q: "¿La IA publica sin mi permiso?",
    a: "Solo si tú lo activas. Por defecto, cada publicación y cada respuesta queda como borrador para que la revises y la apruebes.",
  },
  {
    q: "¿Por qué empezar con Instagram?",
    a: "Es la red donde más pequeños negocios venden y crean comunidad. Facebook, TikTok y YouTube se suman en los planes superiores.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Sin contratos ni permanencia: cancelas desde tu panel y no se vuelve a cobrar.",
  },
];

export default async function Home() {
  const session = await readSession();

  return (
    <div className="min-h-screen bg-[#0a0911] font-sans text-slate-300 antialiased [color-scheme:dark]">
      <Backdrop />

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:py-8">
        <div className="relative overflow-hidden rounded-[28px] border border-violet-300/20 bg-[#0e0d17]/80 shadow-[0_0_80px_-20px_rgba(139,92,246,0.35)] backdrop-blur">
          <Nav loggedIn={!!session} />
          <Hero loggedIn={!!session} />
          <Audience />
          <HowItWorks />
          <Features />
          <Comparison />
          <Pricing />
          <Faq />
          <FinalCta loggedIn={!!session} />
          <Footer />
        </div>
      </div>
    </div>
  );
}

/* ---------- Secciones ---------- */

function Nav({ loggedIn }: { loggedIn: boolean }) {
  const links = [
    ["Cómo funciona", "#como-funciona"],
    ["Funciones", "#funciones"],
    ["Comparativa", "#comparativa"],
    ["Precios", "#precios"],
    ["Preguntas", "#preguntas"],
  ];
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-5 sm:px-10">
      <Logo />
      <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
        {links.map(([label, href]) => (
          <a key={href} href={href} className="transition hover:text-white">
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        {loggedIn ? (
          <Link href="/dashboard" className={btnPrimary + " px-4 py-2"}>
            Ir a mi panel
          </Link>
        ) : (
          <>
            <span className="hidden sm:contents">
              <Link href="/login" className={btnGhost + " px-4 py-2"}>
                Iniciar sesión
              </Link>
            </span>
            <Link href="/register" className={btnPrimary + " px-4 py-2"}>
              Prueba gratis
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="relative px-5 pb-20 pt-14 text-center sm:px-10 sm:pt-20">
      <Waves />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
          Empezamos con Instagram
        </span>
        <h1 className="mx-auto mt-6 max-w-5xl text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
          Tu negocio presente en redes, <GradientText>todos los días</GradientText>, sin contratar a nadie
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          SocialPilot crea, programa y mide tu contenido de Instagram con inteligencia artificial, y te ayuda a responder a tu
          comunidad. Constancia de community manager, por una fracción del costo.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={loggedIn ? "/dashboard" : "/register"} className={btnPrimary + " px-7 py-3 text-base"}>
            {loggedIn ? "Ir a mi panel" : "Empieza gratis"}
          </Link>
          <a href="#como-funciona" className={btnGhost + " px-7 py-3 text-base"}>
            Ver cómo funciona
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-16 max-w-3xl">
      <div className="absolute inset-x-10 -top-6 bottom-0 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="relative grid gap-4 rounded-2xl border border-white/10 bg-[#13121e]/90 p-4 text-left sm:grid-cols-[1.1fr_1fr] sm:p-5">
        {/* Publicación */}
        <div className="rounded-xl border border-white/10 bg-[#0f0e18] p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 p-[2px]">
              <div className="h-full w-full rounded-full bg-[#0f0e18]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">cafe.lunares</div>
              <div className="text-[11px] text-slate-500">Instagram · Publicación</div>
            </div>
          </div>
          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-[#3b1f4a] via-[#2a1f4f] to-[#1b2350]">
            <div className="absolute left-6 top-6 h-24 w-24 rounded-full bg-rose-400/40 blur-2xl" />
            <div className="absolute bottom-4 right-6 h-28 w-28 rounded-full bg-violet-500/40 blur-2xl" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-white">2x1 en lattes</div>
                <div className="mt-1 text-xs text-white/70">Solo este jueves · 4 a 7 pm</div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-300">
            ☕ El jueves se antoja doble. Trae a quien te alegra la semana y llévate dos lattes por uno. ¿A quién vas a
            invitar? 👇 <span className="text-violet-300">#CafeDeBarrio #Jueves2x1</span>
          </p>
        </div>

        {/* Panel lateral */}
        <div className="flex flex-col gap-3">
          <MockCard>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Estado</span>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Programada</span>
            </div>
            <div className="mt-2 font-display text-lg font-semibold text-white">Jueves, 7:30 pm</div>
            <div className="text-xs text-slate-500">Mejor horario para tu audiencia</div>
          </MockCard>
          <MockCard>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Icon name="spark" className="h-4 w-4 text-rose-300" /> Sugerencia de la IA
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
              Tus publicaciones con pregunta al final reciben <span className="font-semibold text-white">2,3× más comentarios</span>.
              Agregué una a este texto.
            </p>
          </MockCard>
          <MockCard>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Icon name="chat" className="h-4 w-4 text-violet-300" /> Nuevo comentario
            </div>
            <p className="mt-2 text-[13px] text-slate-300">“¿Tienen leche de avena?”</p>
            <div className="mt-2 rounded-lg bg-violet-500/10 px-3 py-2 text-[13px] text-violet-200">
              ¡Sí! Y sin costo extra 💜 Te esperamos el jueves.
            </div>
          </MockCard>
        </div>
      </div>
    </div>
  );
}

function Audience() {
  const items = ["Cafeterías", "Tiendas", "Estéticas", "Restaurantes", "Gimnasios", "Consultorios", "Emprendedores"];
  return (
    <section className="border-y border-white/5 px-5 py-10 text-center sm:px-10">
      <div className="flex items-center justify-center gap-4">
        <Squiggle />
        <p className="font-display text-base font-medium text-white sm:text-lg">
          Hecho para <GradientText>pequeños y medianos negocios</GradientText>
        </p>
        <Squiggle flip />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {items.map((i) => (
          <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-slate-400">
            {i}
          </span>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-6 px-5 py-20 sm:px-10">
      <SectionHeader
        eyebrow="Cómo funciona SocialPilot"
        title="Constancia en redes, en piloto automático"
        text="Tres pasos para pasar de “no tengo tiempo de publicar” a una cuenta activa que conversa con tus clientes."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="group relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-7 text-center transition hover:border-violet-400/40"
          >
            <div className="mx-auto font-display text-sm font-semibold text-rose-300/80">{s.n}</div>
            <h3 className="mt-2 font-display text-2xl font-semibold text-violet-300">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="funciones" className="scroll-mt-6 px-5 py-20 sm:px-10">
      <SectionHeader
        eyebrow="Funciones"
        title="Todo lo que haría un community manager"
        text="Desde la idea hasta la respuesta al cliente, en un solo lugar y con la IA trabajando para ti."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:bg-white/[0.04]">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-400/20 to-violet-500/20 ring-1 ring-white/10">
              <Icon name={f.icon} className="h-5 w-5 text-violet-200" />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Comparison() {
  const rows: [string, string, string][] = [
    ["Costo mensual", "Desde $300–800 USD", "Desde $19 USD"],
    ["Publicaciones constantes", "Depende de su agenda", "Programadas por adelantado"],
    ["Disponibilidad", "Horario laboral", "Todos los días, 24/7"],
    ["Ideas y textos", "Sí", "Sí, con la voz de tu marca"],
    ["Análisis de resultados", "Reporte mensual", "En tiempo real, con recomendaciones"],
    ["Si se va o se enferma", "Empiezas de cero", "Tu historial y estrategia se quedan"],
  ];
  return (
    <section id="comparativa" className="scroll-mt-6 px-5 py-20 sm:px-10">
      <SectionHeader
        eyebrow="La alternativa"
        title={
          <>
            Hasta <GradientText>90% menos</GradientText> que un community manager
          </>
        }
        text="Mantenerte presente en redes no debería costar un sueldo. SocialPilot hace el trabajo diario y tú conservas el control."
      />
      <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl border border-white/10">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] bg-white/[0.03] font-semibold uppercase tracking-wide">
          <div className="p-3 text-slate-500 sm:p-5" />
          <div className="p-3 text-[11px] text-slate-400 sm:p-5 sm:text-sm">Community manager</div>
          <div className="bg-violet-500/10 p-3 text-[11px] text-violet-200 sm:p-5 sm:text-sm">SocialPilot</div>
        </div>
        {rows.map(([label, cm, sp]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] border-t border-white/5 text-xs sm:text-sm">
            <div className="p-3 font-medium text-slate-300 sm:p-5">{label}</div>
            <div className="p-3 text-slate-500 sm:p-5">{cm}</div>
            <div className="flex items-start gap-2 bg-violet-500/[0.06] p-3 text-white sm:p-5">
              <Icon name="check" className="mt-0.5 hidden h-4 w-4 shrink-0 text-emerald-300 sm:block" />
              {sp}
            </div>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-slate-600">
        Rango de referencia de honorarios de un community manager independiente; varía según país y experiencia.
      </p>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precios" className="scroll-mt-6 px-5 py-20 sm:px-10">
      <SectionHeader
        eyebrow="Precios"
        title="Planes simples, sin sorpresas"
        text="Empieza gratis 14 días. Cambia de plan o cancela cuando quieras."
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={
              "relative flex flex-col rounded-3xl p-7 " +
              (p.highlighted
                ? "border border-violet-400/50 bg-gradient-to-b from-violet-500/15 to-white/[0.02] shadow-[0_0_60px_-15px_rgba(139,92,246,0.6)]"
                : "border border-white/10 bg-white/[0.02]")
            }
          >
            {p.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-400 to-violet-500 px-3 py-1 text-xs font-semibold text-white">
                Más elegido
              </span>
            )}
            <h3 className="font-display text-xl font-semibold text-white">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{p.tagline}</p>
            <div className="mt-6 flex items-end gap-1">
              <span className="font-display text-5xl font-bold text-white">${p.price}</span>
              <span className="mb-1.5 text-sm text-slate-500">USD / mes</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-slate-300">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={(p.highlighted ? btnPrimary : btnGhost) + " mt-8 w-full py-3"}
            >
              Empezar prueba gratis
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-6 px-5 py-20 sm:px-10">
      <SectionHeader eyebrow="Preguntas frecuentes" title="Lo que suelen preguntarnos" />
      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 open:bg-white/[0.04]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-medium text-white [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="px-5 pb-20 sm:px-10">
      <div className="relative overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-[#2a1740] via-[#1d1638] to-[#151a3a] px-6 py-16 text-center">
        <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-rose-500/30 blur-3xl" />
        <div className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">
            Deja de preocuparte por qué publicar mañana
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Conecta tu Instagram hoy y ten tu primera semana de contenido lista en menos de 15 minutos.
          </p>
          <Link href={loggedIn ? "/dashboard" : "/register"} className={btnPrimary + " mt-8 px-8 py-3 text-base"}>
            {loggedIn ? "Ir a mi panel" : "Crear mi cuenta gratis"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:px-10">
      <Logo small />
      <p>© {new Date().getFullYear()} SocialPilot. Presencia digital para negocios que no paran.</p>
    </footer>
  );
}

/* ---------- Piezas reutilizables ---------- */

const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60";
const btnPrimary =
  btnBase +
  " bg-gradient-to-r from-[#6d4cf5] to-[#8b5cf6] text-white shadow-[0_8px_30px_-8px_rgba(124,77,255,0.8)] hover:brightness-110";
const btnGhost = btnBase + " border border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/5";

function GradientText({ children }: { children: React.ReactNode }) {
  return <span className="bg-gradient-to-r from-[#ff7a85] via-[#e879c9] to-[#a78bfa] bg-clip-text text-transparent">{children}</span>;
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-block rounded-full bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-300">{eyebrow}</span>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-slate-400">{text}</p>}
    </div>
  );
}

function MockCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-[#0f0e18] p-4">{children}</div>;
}

function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={"grid place-items-center rounded-lg bg-gradient-to-br from-[#ff7a85] to-[#8b5cf6] " + (small ? "h-7 w-7" : "h-8 w-8")}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" />
          <path d="m10 13 4.5-4.5" />
        </svg>
      </span>
      <span className={"font-display font-semibold text-white " + (small ? "text-base" : "text-xl")}>SocialPilot</span>
    </Link>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-violet-700/20 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 h-[520px] w-[520px] rounded-full bg-fuchsia-700/15 blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-indigo-700/15 blur-[120px]" />
    </div>
  );
}

function Waves() {
  return (
    <svg aria-hidden viewBox="0 0 1200 400" className="pointer-events-none absolute inset-x-0 top-24 h-[420px] w-full opacity-40" fill="none">
      {Array.from({ length: 14 }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${220 + i * 6} C 250 ${120 + i * 9}, 420 ${330 - i * 5}, 640 ${230 + i * 3} S 1000 ${110 + i * 8}, 1200 ${200 + i * 5}`}
          stroke="url(#wave)"
          strokeWidth="0.8"
        />
      ))}
      <defs>
        <linearGradient id="wave" x1="0" x2="1200" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" stopOpacity="0" />
          <stop offset="0.3" stopColor="#a78bfa" stopOpacity="0.5" />
          <stop offset="0.7" stopColor="#f472b6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Squiggle({ flip }: { flip?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 60 12" className={"hidden h-3 w-14 text-violet-400/60 sm:block " + (flip ? "-scale-x-100" : "")} fill="none">
      <path d="M0 6c10 0 10-5 20-5s10 10 20 10 10-5 20-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />,
    chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />,
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    bulb: (
      <>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
      </>
    ),
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
