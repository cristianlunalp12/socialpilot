"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-lg">
      <h1 className="font-semibold">No se pudo completar la acción</h1>
      <p className="mt-2 text-sm text-slate-600">{process.env.NODE_ENV === "development" ? error.message : "Ocurrió un error inesperado."}</p>
      <button className="btn-secondary mt-4" onClick={reset}>Reintentar</button>
    </div>
  );
}
