# Configuración de Supabase

1. Crea un proyecto en Supabase y, en **Authentication > Providers**, habilita Email.
2. En **SQL Editor**, ejecuta las migraciones de `supabase/migrations/` **en orden numérico**:
   - `001_initial_schema.sql` — perfiles, hábitos, registros diarios, preferencias de recordatorio, RLS y el trigger que siembra los cuatro hábitos iniciales.
   - `002_habit_suggestions.sql` — cola `habit_suggestions` que alimenta el formulario de metas («Pedir ideas»). Sin esta migración ese botón falla.
   - `003_updated_at_triggers.sql` — triggers que mantienen `updated_at` al día en las cuatro tablas de `001`. Se puede reejecutar sin efectos secundarios.
   - `004_in_app_reminders.sql` — activa por defecto los avisos de hábitos pendientes. Sin esta migración las cuentas existentes los tendrán apagados, porque `enabled` nació pensado para WhatsApp.
   - `005_ai_settings.sql` — configuración general de la IA (`app_settings`), administradores (`app_admins`) y las funciones con las que el administrador cambia la clave sin que esta salga del servidor.
3. Copia `.env.example` como `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project Settings > API**.
4. En **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:5173` en desarrollo y la URL de Netlify al desplegar.
   - **Redirect URLs**: agrega `http://localhost:5173/nueva-contrasena` y `https://<tu-dominio>/nueva-contrasena`. Sin esto, el enlace de recuperación de contraseña no puede volver a la aplicación.

La clave `anon` es pública y puede usarse desde el frontend. Nunca agregues la clave `service_role` al frontend ni al repositorio.

## Sugerencias con Gemini

La aplicación usa una sola clave de Gemini para todos los usuarios. Vive en el servidor y la llama la Edge Function `suggest-habits`.

1. Ejecuta `005_ai_settings.sql`.
2. Nómbrate administrador en el **SQL Editor**, con el correo de tu cuenta:

   ```sql
   insert into public.app_admins (user_id)
   select id from auth.users where email = 'tu@correo.com'
   on conflict do nothing;
   ```

3. Despliega la función. Desde el panel: **Edge Functions > Deploy a new function > Via Editor**, nómbrala exactamente `suggest-habits` y pega el contenido de `supabase/functions/suggest-habits/index.ts`. O con la CLI:

   ```bash
   npx supabase login
   npx supabase functions deploy suggest-habits --project-ref <ref-de-tu-proyecto>
   ```

   No hace falta definir secretos: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya existen dentro de las Edge Functions.
4. Entra en la aplicación, ve a **Ajustes > Inteligencia artificial**, pega la clave de Google AI Studio y pulsa **Probar y guardar**. La sección solo aparece para administradores.

Para migrar de modelo basta con cambiar el campo **Modelo** en esa misma pantalla; la clave se conserva si dejas su campo vacío.

El flujo con Make que se evaluó antes quedó descartado y se conserva solo como referencia en [`MAKE_GPT_SETUP.md`](MAKE_GPT_SETUP.md).
