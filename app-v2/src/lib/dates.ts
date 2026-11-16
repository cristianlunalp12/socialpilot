/** Utilidades de fechas con zona horaria del workspace, sin dependencias externas. */

function parts(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

function offsetMs(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convierte "2026-11-20T10:30" (hora local de `timeZone`) a un Date UTC. */
export function zonedToUtc(local: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ts = guess - offsetMs(new Date(guess), timeZone);
  ts = guess - offsetMs(new Date(ts), timeZone); // segundo paso por cambios de horario
  return new Date(ts);
}

/** Date -> "2026-11-20T10:30" en la zona indicada (para inputs datetime-local). */
export function utcToZonedInput(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/** Clave de día "2026-11-20" en la zona indicada. */
export function dayKey(date: Date, timeZone: string) {
  return utcToZonedInput(date, timeZone).slice(0, 10);
}

export function formatDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("es", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("es", { timeZone, timeStyle: "short" }).format(date);
}

export const TIMEZONES = [
  "America/Mexico_City", "America/Bogota", "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires",
  "America/Caracas", "America/Guatemala", "America/New_York", "America/Los_Angeles", "Europe/Madrid", "UTC",
];
