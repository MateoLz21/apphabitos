# Rutina — seguimiento de hábitos

Aplicación web para registrar hábitos diarios y ver la constancia acumulada. Cada usuario
arranca con cuatro hábitos sembrados (ordenar la cama, hacer ejercicio, comer saludable,
ahorrar dinero) y puede añadir los suyos, booleanos o cuantitativos.

Pensada para móvil primero: navegación inferior fija, panel de creación como hoja inferior
y diseño responsive que se reacomoda a partir de 768 px.

## Stack

| Capa | Herramienta |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 7 |
| Rutas | React Router 7 (rutas del historial) |
| Backend | Supabase (Postgres + Auth, RLS por usuario) |
| Iconos | lucide-react |
| Estilos | CSS propio en `src/styles/index.css` |

Sin framework de CSS y sin librería de gráficos: las barras de cumplimiento y el heatmap
del calendario son CSS.

## Puesta en marcha

```bash
npm install
cp .env.example .env    # completa las dos variables
npm run dev             # http://localhost:5173
```

La app arranca sin Supabase configurado, pero muestra un aviso y deja el acceso
deshabilitado: `src/lib/supabase.ts` expone `isSupabaseConfigured` y el cliente queda en
`null` si faltan las variables.

Para crear el proyecto Supabase, ejecutar las migraciones y configurar las URLs de
redirección, sigue [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

### Variables de entorno

| Variable | Qué es |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto, en **Project Settings > API** |
| `VITE_SUPABASE_ANON_KEY` | Clave `anon`, pública por diseño |

La clave `anon` puede vivir en el frontend: el aislamiento entre usuarios lo garantizan las
políticas RLS, no el secreto de la clave. La clave `service_role` **nunca** va al frontend ni
al repositorio — solo dentro de Make, según [`MAKE_GPT_SETUP.md`](MAKE_GPT_SETUP.md).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | `tsc -b` y luego el build de producción a `dist/` |
| `npm run lint` | ESLint 9 sobre todo el proyecto |
| `npm run preview` | Sirve `dist/` para revisar el build |

## Estructura

```
src/
  lib/supabase.ts          cliente y flag de configuración
  contexts/
    auth-context.ts        contexto y hook useAuth
    AuthContext.tsx        proveedor que escucha onAuthStateChange
  components/              ProtectedRoute, PlaceholderPage, HabitCreationPanel
  pages/                   AuthPage, UpdatePasswordPage, TodayPage, HistoryPage, StatisticsPage
  services/
    habits.ts              lectura y escritura de hábitos y registros diarios
    analytics.ts           consultas por rango para historial y métricas
  utils/dates.ts           claves YYYY-MM-DD en hora local y aritmética de rangos
  types/habits.ts          tipos compartidos
supabase/migrations/       001 esquema y RLS · 002 cola de sugerencias · 003 triggers updated_at
```

### Rutas

| Ruta | Acceso |
| --- | --- |
| `/acceso`, `/registro`, `/recuperar` | pública |
| `/nueva-contrasena` | pública, llega desde el correo de recuperación |
| `/hoy`, `/historial`, `/estadisticas`, `/ajustes` | requiere sesión |

Cualquier otra ruta redirige a `/hoy`.

## Notas de implementación

**Fechas en hora local.** Las claves de día son `YYYY-MM-DD` construidas con los getters
locales (`utils/dates.ts`), no con `toISOString()`, que desplazaría el día para quien esté
en UTC-5. `daysInclusive` usa `Math.round` sobre el delta en milisegundos para que los
cambios de horario de 23 o 25 horas no descuenten un día.

**Denominadores de las métricas.** Los porcentajes de cumplimiento se calculan sobre los
días en que el hábito ya existía (`habits.created_at`), no sobre el periodo completo. Un
hábito creado ayer y cumplido ayer marca 100 %, no 3 %.

**Rachas.** El día en curso sin marcar no rompe la racha: si hoy todavía no está registrado
se cuenta desde ayer. Así la racha no aparece en cero a las 00:01.

## Despliegue

`netlify.toml` ya trae la configuración: build `npm run build`, publicación de `dist/` y la
regla de reescritura `/*` → `/index.html` que las rutas del historial necesitan para no dar
404 al abrirlas directamente.

En Netlify hay que definir a mano `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en
**Site configuration > Environment variables**, y añadir el dominio del sitio a las
**Redirect URLs** de Supabase — incluido `https://<tu-dominio>/nueva-contrasena`, o el
enlace de recuperación no podrá volver a la aplicación.

## Estado

Fases 0 a 4 implementadas: fundaciones, autenticación completa con recuperación de
contraseña, registro diario, historial mensual y estadísticas de rachas y cumplimiento.

Pendiente la Fase 5 (recordatorios por WhatsApp y sugerencias de hábitos con IA; `/ajustes`
sigue siendo un placeholder) y la Fase 6 (pruebas, accesibilidad y despliegue). El detalle
está en [`PLAN_DESARROLLO.md`](PLAN_DESARROLLO.md).
