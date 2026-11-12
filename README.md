# SocialPilot

SaaS multiusuario para **automatizar publicaciones** en Facebook, Instagram, TikTok y YouTube, **recoger métricas y comentarios** y convertirlos en **decisiones** con ayuda de Claude.

## Qué hace

| Módulo | Descripción |
|---|---|
| **Workspaces y equipo** | Cada marca/cliente es un workspace. Roles: Owner, Admin, Editor y Solo lectura. Invitaciones por enlace. |
| **Conexión de cuentas** | OAuth oficial: Meta (Páginas de FB + IG Business/Creator), TikTok (Login Kit + Content Posting API), YouTube (Data API + Analytics API). Los tokens se guardan cifrados (AES-256-GCM) y se refrescan solos. |
| **Compositor** | Un texto base, adaptado por red, con vista previa y contador de caracteres. Valida el formato que exige cada red (IG necesita imagen o video; TikTok y YouTube, video). Se puede publicar al momento, programar o guardar como borrador. |
| **IA: copys** | Claude genera una versión nativa del texto para cada red, usando la voz de marca del workspace y las publicaciones que mejor funcionaron como referencia. |
| **Publicación automática** | Un worker (pg-boss sobre Postgres) toma las publicaciones programadas cada minuto (`FOR UPDATE SKIP LOCKED`, sin duplicados), publica, reintenta con backoff y registra los errores por red. |
| **Métricas** | Se sincronizan cada 2 h (vistas, alcance, likes, comentarios, compartidos, guardados y tiempo de visualización) y se guardan como serie temporal. Los seguidores se registran a diario. |
| **Retroalimentación** | Bandeja unificada de comentarios. Claude clasifica sentimiento y temas y marca los que requieren respuesta. Filtros por tema, sentimiento y pendientes. |
| **Recomendaciones IA** | Cada lunes (o a demanda), Claude analiza un informe agregado de 30 días y devuelve acciones priorizadas por impacto, los mejores horarios por red e ideas de contenido. Todo queda guardado en un historial. |
| **Dashboard** | KPIs, vistas por día y red, engagement por red, crecimiento de seguidores, sentimiento, temas y publicaciones destacadas. |

## Arquitectura

```
Next.js 15 (App Router, Server Actions)          Worker (npm run worker)
 ├─ UI: dashboard, compositor, inbox, insights     ├─ dispatch-scheduled  (cada minuto)
 ├─ /api/oauth/[provider]/start|callback           ├─ publish-post
 ├─ /api/upload                                    ├─ sync-metrics        (cada 2 h) → analyze-comments
 └─ src/lib                                        ├─ sync-account-stats  (diario)
     ├─ platforms/  meta · tiktok · youtube · mock └─ recommendations     (lunes)
     ├─ ai.ts       Claude (structured outputs)
     ├─ analytics.ts informe agregado              PostgreSQL ← Prisma + cola pg-boss
     └─ services/   publish · sync
```

- **Base de datos**: `prisma/schema.prisma`. Tablas `Workspace`, `Membership`, `SocialAccount`, `Post`, `PostTarget` (una por red), `PostMetric` (serie temporal), `Comment`, `AccountSnapshot` y `Recommendation`.
- **Adaptadores** (`src/lib/platforms/*`): implementan una interfaz común (`publish`, `fetchMetrics`, `fetchComments`, `fetchAccountStats`, `refresh`). Para añadir una red (LinkedIn, X…) basta con escribir un adaptador nuevo.
- **IA** (`src/lib/ai.ts`): usa `claude-opus-5-5` con salidas estructuradas validadas con Zod. El esfuerzo es `low` para clasificar comentarios, `medium` para los copys y `high` para las recomendaciones. Tiene activado el **fallback del lado del servidor** (`fallbacks: "default"`): si el modelo rechaza una petición, la API la reintenta automáticamente con otro modelo. Se puede quitar en `structured()` si no lo quieres.

## Puesta en marcha (local)

```bash
cp .env.example .env          # genera AUTH_SECRET y ENCRYPTION_KEY con: openssl rand -base64 32
docker compose up -d db       # o usa tu propio Postgres
npm install
npx prisma migrate deploy
npm run db:seed               # opcional: datos demo → demo@socialpilot.dev / demo12345
npm run dev                   # web en http://localhost:3000
npm run worker                # en otra terminal: publicación programada, sync e IA
```

Con `PLATFORM_MODE="mock"` (por defecto) **todas las redes se simulan**. Puedes conectar cuentas, publicar y ver cómo crecen las métricas y llegan comentarios sin credenciales reales. Para usar la IA, pon `ANTHROPIC_API_KEY` en `.env`.

## Pasar a redes reales (`PLATFORM_MODE="live"`)

Configura en cada portal de desarrollador la URL de redirección `{APP_URL}/api/oauth/{meta|tiktok|youtube}/callback`.

| Red | Requisitos |
|---|---|
| **Meta** | App en developers.facebook.com con *Facebook Login for Business*. Permisos: `pages_manage_posts`, `pages_read_engagement`, `read_insights`, `instagram_content_publish`, `instagram_manage_insights`, `instagram_manage_comments`… Para clientes externos hace falta **App Review** y verificar el negocio. IG tiene que ser una cuenta Business/Creator vinculada a una Página. |
| **TikTok** | App con Login Kit + Content Posting API (Direct Post). **Mientras la app no pase la auditoría solo se puede publicar en privado (`SELF_ONLY`)**. `PULL_FROM_URL` exige verificar el dominio del que se sirven los videos. La API pública **no da acceso a los comentarios**. |
| **YouTube** | Proyecto en Google Cloud con YouTube Data API v3 y YouTube Analytics API, y la pantalla de consentimiento OAuth configurada. Los scopes sensibles requieren **verificación de Google**, y la cuota por defecto (10 000 unidades/día, unas 6 subidas) puede ampliarse con una solicitud. |

**Archivos multimedia:** Instagram, TikTok y YouTube descargan el archivo desde una **URL pública**. `/api/upload` guarda los archivos en `public/uploads`, lo que sirve para desarrollo. En producción hay que cambiarlo por S3, R2 o GCS.

## Producción

- Despliega la web (Vercel, Fly o Render) y el **worker como proceso aparte** (contenedor o servicio en segundo plano). Comparten la misma `DATABASE_URL`.
- Ejecuta `npm run db:deploy` en cada despliegue.
- Los cron del worker están en UTC (`src/worker/index.ts`).

## Roadmap sugerido

1. Almacenamiento S3 y transcodificación de video.
2. Responder comentarios desde la bandeja (Graph API y YouTube ya lo permiten), con borradores de respuesta generados por IA.
3. Calendario visual con arrastrar y soltar.
4. Facturación (Stripe) y límites por plan.
5. Webhooks de Meta para recibir comentarios en tiempo real en vez de por sondeo.
6. Pruebas A/B de copys y aprendizaje automático de los mejores horarios.
7. LinkedIn y X como adaptadores nuevos.
