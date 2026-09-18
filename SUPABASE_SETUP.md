# Configuración de Supabase

1. Crea un proyecto en Supabase y, en **Authentication > Providers**, habilita Email.
2. En **SQL Editor**, ejecuta `supabase/migrations/001_initial_schema.sql`.
3. Copia `.env.example` como `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project Settings > API**.
4. En **Authentication > URL Configuration**, agrega `http://localhost:5173` y, al desplegar, la URL de Netlify.

La clave `anon` es pública y puede usarse desde el frontend. Nunca agregues la clave `service_role` al frontend ni al repositorio.
