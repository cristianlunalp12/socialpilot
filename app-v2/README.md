# SocialPilot v2

Nueva base de SocialPilot, rehecha desde cero y más simple: programa publicaciones en Facebook, Instagram, TikTok y YouTube y mide sus resultados en un solo panel.

> La app anterior sigue en la raíz del repositorio. Esta versión vive aparte, en `app-v2/`, y no comparte código ni base de datos con ella.

## Qué incluye

- **Cuentas y equipos**: registro, inicio de sesión, workspaces (uno por marca o cliente), invitaciones por enlace y roles (propietario, administrador, editor, lector).
- **Publicaciones**: editor con selección de redes y límite de caracteres por red; publicar ahora, programar o guardar como borrador. Reintentos automáticos (3 intentos con espera creciente) y botón para reintentar las que fallaron.
- **Calendario** mensual con lo publicado y lo programado; clic en "+" para programar ese día.
- **Estadísticas**: seguidores, impresiones, tasa de interacción y publicaciones, comparadas con el periodo anterior (7, 30 o 90 días); gráfico de seguidores por red, tasa de interacción por red y las publicaciones con más interacción.
- **Worker** en segundo plano: publica lo programado cada 30 s y actualiza métricas cada 15 min.

Las redes están **simuladas** (`PLATFORM_MODE=mock`): no se publica nada real. Las integraciones reales (OAuth y API de cada red) son el siguiente paso; cada una se implementa en `src/lib/platforms.ts` cumpliendo la interfaz `PlatformAdapter`.

## Probarla en tu computadora

Necesitas [Node.js 20 o superior](https://nodejs.org). Desde la carpeta `app-v2`:

```bash
npm install
```

```bash
npm run demo
```

Arranca una base de datos integrada (sin Docker), carga datos de ejemplo, levanta la web y el worker y abre el navegador. Entra con **demo@socialpilot.dev / demo12345**. Para empezar de cero, borra la carpeta `.demo`.

## Desarrollo con tu propio PostgreSQL

1. Copia `.env.example` a `.env` y completa `DATABASE_URL` y `AUTH_SECRET`.
2. `npx prisma migrate dev` para crear las tablas.
3. `npm run db:seed` (opcional) para los datos de demo.
4. `npm run dev` para la web y, en otra terminal, `npm run worker`.

Verificar antes de subir cambios: `npx tsc --noEmit` y `npm run build`.

## Producción

`npm run build` y después `npm run start:prod`: aplica migraciones, carga la demo si `DEMO_SEED=1` y arranca la web y el worker en el mismo proceso. Variables necesarias: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` y `PLATFORM_MODE`.

## Estructura

| Ruta | Qué hay |
|---|---|
| `prisma/schema.prisma` | Modelo de datos: usuarios, workspaces, miembros, invitaciones, cuentas sociales, métricas diarias, publicaciones y sus destinos por red |
| `src/app/actions.ts` | Todas las acciones del servidor (formularios) |
| `src/app/(auth)` | Login y registro |
| `src/app/(app)` | Páginas internas: estadísticas, publicaciones, calendario, redes, configuración |
| `src/lib/platforms.ts` | Adaptadores de redes (hoy, la simulación) |
| `src/lib/publisher.ts` | Publicación con bloqueo atómico y reintentos |
| `src/lib/metrics.ts`, `src/lib/analytics.ts` | Sincronización de métricas y cálculos del panel |
| `src/lib/dates.ts` | Conversión de horas según la zona horaria del workspace |
| `src/worker/index.ts` | Proceso en segundo plano |
