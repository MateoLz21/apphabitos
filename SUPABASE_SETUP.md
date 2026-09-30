# Configuración de Supabase

1. Crea un proyecto en Supabase y, en **Authentication > Providers**, habilita Email.
2. En **SQL Editor**, ejecuta las migraciones de `supabase/migrations/` **en orden numérico**:
   - `001_initial_schema.sql` — perfiles, hábitos, registros diarios, preferencias de recordatorio, RLS y el trigger que siembra los cuatro hábitos iniciales.
   - `002_habit_suggestions.sql` — cola `habit_suggestions` que alimenta el formulario de metas («Pedir ideas»). Sin esta migración ese botón falla.
   - `003_updated_at_triggers.sql` — triggers que mantienen `updated_at` al día en las cuatro tablas de `001`. Se puede reejecutar sin efectos secundarios.
3. Copia `.env.example` como `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project Settings > API**.
4. En **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:5173` en desarrollo y la URL de Netlify al desplegar.
   - **Redirect URLs**: agrega `http://localhost:5173/nueva-contrasena` y `https://<tu-dominio>/nueva-contrasena`. Sin esto, el enlace de recuperación de contraseña no puede volver a la aplicación.

La clave `anon` es pública y puede usarse desde el frontend. Nunca agregues la clave `service_role` al frontend ni al repositorio.

Para conectar la automatización que responde las solicitudes de `habit_suggestions`, continúa con [`MAKE_GPT_SETUP.md`](MAKE_GPT_SETUP.md).
