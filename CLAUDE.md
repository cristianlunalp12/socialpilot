# SocialPilot: estado del proyecto

SaaS multiusuario para programar publicaciones en Facebook, Instagram, TikTok y YouTube, recoger métricas y comentarios, y generar recomendaciones con Claude. La guía completa para usuarios está en `README.md`.

## Stack
- Next.js 15 (App Router, Server Actions), TypeScript y Tailwind v4.
- PostgreSQL + Prisma 6. La cola de trabajos es pg-boss (sin Redis), con el worker en `src/worker/index.ts`.
- IA: `@anthropic-ai/sdk` en `src/lib/ai.ts`, con salidas estructuradas (Zod) y fallbacks del lado del servidor.
- Redes: adaptadores en `src/lib/platforms/*`. `PLATFORM_MODE=mock` las simula; `live` usa las API reales.

## Hecho (noviembre 2026)
- Workspaces, roles e invitaciones. OAuth de Meta, TikTok y YouTube, con tokens cifrados.
- Compositor con adaptación de textos por IA; publicación inmediata y programada con reintentos.
- Sync de métricas y comentarios, análisis de sentimiento y temas, recomendaciones semanales.
- Dashboard, bandeja de retroalimentación, página de insights.
- Demo local con un solo comando: `npm run demo` (Postgres integrado y forzado a UTF-8 por Windows) y lanzadores `.bat` / `.command`. Probado por el usuario en Windows.
- Botones "Próximamente" (fake doors): `src/lib/upcoming.ts` y `src/components/ComingSoon.tsx`. Registran clics (`FeatureInterest`) y lista de espera (`WaitlistEntry`); los datos se ven en `/admin` (acceso por `ADMIN_EMAILS`).
- Landing pública en `/` (`src/app/page.tsx`): estética oscura con degradados coral/violeta, comparativa contra un community manager, planes y FAQ. Precios de referencia en la constante `PLANS` (Inicial 19, Pro 39, Business 79 USD), aún sin cobro real. Usuarios con sesión ven "Ir a mi panel".
- Despliegue: `render.yaml` (Blueprint) + `npm run start:prod`, que ejecuta migraciones, la semilla opcional (`DEMO_SEED`), la web y el worker juntos. Los archivos subidos se sirven desde `/media/[file]`.

## Pendiente / siguientes pasos
1. El usuario va a desplegar en Render. `render.yaml` no se pudo validar contra la documentación de Render (red bloqueada en la sesión): revisar si da errores.
2. Páginas de política de privacidad y términos (requisito de las revisiones de Meta, TikTok y Google).
3. Precios ya visibles en la landing; falta confirmar los montos y la facturación con Stripe (la landing promete 14 días de prueba sin tarjeta).
4. Almacenamiento S3/R2 para archivos subidos (el disco de Render no persiste).
5. La IA no se ha probado con una API key real.

## Convenciones
- La interfaz y los textos para el usuario van en español.
- Para verificar: `npx tsc --noEmit` y `npm run build`. Para ver la app con datos: `npm run demo` (los datos de demo están en `prisma/seed.ts`).
- Cada cambio del esquema necesita su migración (`npx prisma migrate dev --name ...`).
