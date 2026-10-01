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
al repositorio.

> **La clave de Gemini no es una variable de entorno del frontend.** Es una sola para toda la
> aplicación y vive en el servidor, en la tabla `app_settings`. El administrador la cambia desde
> Ajustes > Inteligencia artificial; el navegador nunca la recibe. Ver
> [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | `tsc -b` y luego el build de producción a `dist/` |
| `npm run lint` | ESLint 9 sobre todo el proyecto |
| `npm run format` | Prettier sobre `src` (`format:check` solo verifica) |
| `npm run preview` | Sirve `dist/` para revisar el build |

## Estructura

```
src/
  lib/
    supabase.ts            cliente y flag de configuración
    functions.ts           invocación de Edge Functions con mensajes de error legibles
  contexts/
    auth-context.ts        contexto y hook useAuth
    AuthContext.tsx        proveedor que escucha onAuthStateChange
    today-context.ts       contexto y hook useToday
    TodayProvider.tsx      hábitos de hoy y preferencias de aviso, compartidos entre rutas
  components/              ProtectedRoute, HabitCreationPanel, PendingHabitsNotice,
                           AiSettingsCard
  pages/                   AuthPage, UpdatePasswordPage, TodayPage, HistoryPage,
                           StatisticsPage, SettingsPage
  services/
    habits.ts              lectura y escritura de hábitos y registros diarios
    analytics.ts           consultas por rango para historial y métricas
    reminders.ts           lectura y guardado de preferencias de aviso
    gemini.ts              pide sugerencias a la Edge Function
    aiSettings.ts          configuración de IA para administradores
    profile.ts             nombre del usuario
  utils/
    dates.ts               claves YYYY-MM-DD en hora local y aritmética de rangos
    reminders.ts           hora actual por zona y disparo del aviso
    progress.ts            avance de un hábito y nivel de color de un día
  types/                   habits.ts, reminders.ts
supabase/migrations/       001 esquema y RLS · 002 cola de sugerencias
                           003 triggers updated_at · 004 avisos internos
                           005 configuración de IA y administradores
supabase/functions/        suggest-habits: llama a Gemini con la clave del servidor
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

**Una sola clave de Gemini, en el servidor.** La clave y el modelo están en `app_settings`, una
tabla con RLS activado y sin políticas: nadie la lee por la API. La Edge Function `suggest-habits`
la lee con `service_role`, llama a Gemini y devuelve los hábitos ya saneados (longitudes
recortadas, `tracking_type` forzado a los dos valores válidos). Como la cuota es compartida, cada
usuario tiene un tope de solicitudes cada 24 horas, contado sobre `habit_suggestions`.

**Administradores.** Están en `app_admins`, no en una columna de `profiles`: la política de
`profiles` deja a cada usuario editar su fila, así que un `is_admin` ahí sería autoasignable. El
administrador cambia clave, modelo y tope desde Ajustes mediante funciones `security definer`
que solo devuelven una pista enmascarada. Antes de guardar, la configuración candidata se prueba
con una llamada real, para que un modelo retirado no deje las sugerencias caídas para todos.

**Avances parciales.** En los hábitos con cantidad, lo que se escribe se **suma** al total del día
(`addHabitProgress` lee el total vigente de la base antes de sumar). `habit_entries` guarda una
fila por hábito y día con ese total; no se guarda cada registro por separado. `utils/progress.ts`
calcula el avance para «Hoy», el aviso de pendientes y el calendario. Rachas y porcentajes siguen
contando solo días con la meta cumplida.

**Historial por día.** En el calendario cada día se puede pulsar para ver qué hábitos se
cumplieron, cuáles quedaron con avance y cuáles sin registrar. Es solo de consulta: los días
pasados no se editan. El color del día pondera los avances parciales por su fracción.

**Avisos de pendientes.** La hora de aviso se compara en la zona horaria que el usuario elige,
no en la del dispositivo, usando `Intl.DateTimeFormat` con `hourCycle: 'h23'` — `hour12: false`
devuelve `24:00` a medianoche en algunas implementaciones. `TodayProvider` reevalúa cada minuto,
así que el aviso aparece sin recargar la página.

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

De la Fase 5 están hechos los avisos de hábitos pendientes: aparecen en «Hoy» y como contador
en la barra de navegación, a partir de la hora que el usuario configura en Ajustes, evaluada en
su zona horaria.

También de la Fase 5, el formulario de metas devuelve de 3 a 5 hábitos generados con Gemini, cada
uno con un botón para agregarlo al día. Requiere la migración `005` y desplegar la función
`suggest-habits`.

Los recordatorios por WhatsApp con Make y Twilio quedaron descartados. Pendiente la Fase 6
(pruebas, accesibilidad y despliegue). El detalle está en
[`PLAN_DESARROLLO.md`](PLAN_DESARROLLO.md).
