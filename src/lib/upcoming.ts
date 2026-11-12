/**
 * "Fake door" features: buttons that look real but open a "coming soon with subscription" modal.
 * Clicks and "notify me" requests are stored in FeatureInterest to measure demand before building.
 * Add / remove entries here; use <ComingSoon feature="key"> anywhere in the UI.
 */
export const UPCOMING = {
  calendar: {
    title: "Calendario de contenidos",
    description: "Visualiza y reorganiza todas tus publicaciones arrastrando y soltando en un calendario mensual.",
    plan: "Pro",
  },
  competitors: {
    title: "Análisis de competencia",
    description: "Compara tu crecimiento, frecuencia y engagement con hasta 5 cuentas competidoras.",
    plan: "Pro",
  },
  pdfReport: {
    title: "Reportes PDF automáticos",
    description: "Descarga o recibe cada semana un reporte con tu marca, listo para enviar a clientes o a dirección.",
    plan: "Pro",
  },
  aiReply: {
    title: "Responder con IA",
    description: "Claude redacta respuestas a comentarios con la voz de tu marca; tú solo revisas y publicas.",
    plan: "Pro",
  },
  bestTime: {
    title: "Mejor hora automática",
    description: "Programa cada publicación en el horario con más engagement de tu audiencia, calculado con tus datos.",
    plan: "Pro",
  },
  linkedin: {
    title: "LinkedIn",
    description: "Publica y mide en perfiles y páginas de empresa de LinkedIn.",
    plan: "Business",
  },
  x: {
    title: "X (Twitter)",
    description: "Publica hilos y mide su rendimiento en X.",
    plan: "Business",
  },
  pinterest: {
    title: "Pinterest",
    description: "Programa pines y mide clics y guardados.",
    plan: "Business",
  },
  upgrade: {
    title: "Planes de suscripción",
    description: "Más cuentas, más miembros del equipo, IA ilimitada y todas las funciones Pro. Estamos preparando los planes.",
    plan: "Pro",
  },
} as const satisfies Record<string, { title: string; description: string; plan: "Pro" | "Business" }>;

/** Shared public demo account: its "notify me" requests must ask for the visitor's own email. */
export const DEMO_EMAIL = "demo@socialpilot.dev";

export type UpcomingFeature = keyof typeof UPCOMING;
export const isUpcomingFeature = (k: string): k is UpcomingFeature => k in UPCOMING;
