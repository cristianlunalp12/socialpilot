export function compact(n: number) {
  return new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function number(n: number) {
  return new Intl.NumberFormat("es").format(n);
}

export function percent(n: number, digits = 1) {
  return new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: digits }).format(n);
}
