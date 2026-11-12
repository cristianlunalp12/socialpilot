# SocialPilot

SaaS multiusuario para **automatizar publicaciones** en Facebook, Instagram, TikTok y YouTube, **recoger métricas y comentarios** y convertirlos en **decisiones** con ayuda de Claude.

## 🚀 Probar el demo (5 minutos, sin Docker)

Solo necesitas **Node.js 20 o superior** ([descargar](https://nodejs.org), versión LTS).

1. Descarga el código: botón verde **Code → Download ZIP** en GitHub (y descomprímelo), o `git clone https://github.com/cristianlunalp12/socialpilot.git`
2. Inicia el demo:
   - **Windows:** doble clic en `Iniciar demo (Windows).bat`
   - **Mac:** clic derecho en `iniciar-demo.command` → Abrir (la primera vez macOS pide confirmar)
   - **Cualquier sistema, desde la terminal:** `npm install` y luego `npm run demo`
3. Se abre el navegador en `http://localhost:3000` (o el siguiente puerto libre). Entra con **demo@socialpilot.dev / demo12345**.

El demo levanta una base de datos PostgreSQL integrada (se guarda en la carpeta `.demo/`), carga 40 publicaciones de ejemplo con métricas y comentarios, y simula Facebook, Instagram, TikTok y YouTube. No publica nada real. Para detenerlo pulsa **Ctrl+C**, y para empezar de cero borra la carpeta `.demo/`. Para activar la IA, crea un archivo `.env` con `ANTHROPIC_API_KEY=tu-clave` y reinicia.

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

## Puesta en marcha (desarrollo, con tu propio Postgres)

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

## Publicar en internet (Render)

El repositorio trae un `render.yaml` (Blueprint) que crea **una base de datos Postgres y un servicio web**. Ese servicio ejecuta la app y el worker juntos (`npm run start:prod`), aplica las migraciones y, con `DEMO_SEED=true`, carga el demo.

1. Crea una cuenta en [render.com](https://render.com) entrando **con GitHub** y dale acceso al repo `socialpilot`.
2. **New → Blueprint** → elige el repo → **Apply**. Render genera `AUTH_SECRET` y `ENCRYPTION_KEY` automáticamente.
3. Cuando te los pida, rellena:
   - `ADMIN_EMAILS`: tu email. Debes **registrarte en la app con ese mismo email** para ver `/admin`, con la demanda de funciones y la lista de espera.
   - `ANTHROPIC_API_KEY`: opcional, activa la IA.
4. En unos minutos tendrás una URL pública del tipo `https://socialpilot-xxxx.onrender.com`.

**Plan gratuito (válido para un demo público):** el servicio se duerme tras unos 15 minutos sin visitas (la siguiente visita tarda unos 50 s en despertarlo) y la base de datos gratuita caduca a los 30 días. Revisa los límites vigentes en la web de Render.

**Para clientes reales:**
- Cambia a planes de pago (servicio y Postgres) para que el worker no se duerma.
- Pon `DEMO_SEED=false` y `PLATFORM_MODE=live`, y añade las credenciales de cada red (ver la sección anterior).
- Conecta tu dominio (Settings → Custom Domains) y define `APP_URL=https://tu-dominio.com`.
- Mueve los archivos subidos a S3 o R2: el disco del servicio se borra en cada despliegue.

Otros hosts (Railway, Fly.io, un VPS) funcionan igual: `npm ci && npm run build` para construir, `npm run start:prod` para arrancar, y una `DATABASE_URL` de Postgres.

## Botones "Próximamente" (fake doors)

Sirven para medir el interés en funciones de pago **antes de construirlas**. Parecen botones normales con una etiqueta *Pro* o *Business*, y al pulsarlos abren un aviso "Próximamente con suscripción" con la opción "Avisarme". Están en el menú lateral (Calendario, Competencia y *Mejorar a Pro*), en el dashboard (Exportar PDF), en la bandeja (Responder con IA), en el compositor (Usar mejor hora) y en Configuración (LinkedIn, X y Pinterest).

- Cada clic y cada email de la lista de espera se guardan en la base de datos. Los ves en **/admin**, visible solo para los emails de `ADMIN_EMAILS`. En el demo local, ese admin es la cuenta demo.
- En la cuenta demo compartida, "Avisarme" pide el email del visitante. Así capturas contactos reales.
- Para añadir o quitar funciones, edita `src/lib/upcoming.ts` y usa `<ComingSoon feature="clave">Texto</ComingSoon>` en cualquier pantalla.

## Roadmap sugerido

1. Almacenamiento S3 y transcodificación de video.
2. Responder comentarios desde la bandeja (Graph API y YouTube ya lo permiten), con borradores de respuesta generados por IA.
3. Calendario visual con arrastrar y soltar.
4. Facturación (Stripe) y límites por plan.
5. Webhooks de Meta para recibir comentarios en tiempo real en vez de por sondeo.
6. Pruebas A/B de copys y aprendizaje automático de los mejores horarios.
7. LinkedIn y X como adaptadores nuevos.
