-- `reminder_preferences.enabled` nació para recordatorios por WhatsApp: estaba en `false` por
-- defecto porque enviar mensajes exige consentimiento previo. Ahora los avisos son internos —se
-- muestran dentro de la aplicación y no envían nada—, así que el valor por defecto pasa a `true`.
-- Ejecutar en el SQL Editor de Supabase o mediante Supabase CLI. Es idempotente.

alter table public.reminder_preferences alter column enabled set default true;

-- Las cuentas creadas antes de esta migración quedaron en `false` por el default anterior, no por
-- una decisión del usuario. Se activan para que vean el aviso sin tener que ir a Ajustes.
update public.reminder_preferences set enabled = true where enabled = false;

-- `channel`, `phone_number`, `consent_given` y `last_reminder_at` quedan sin uso mientras los
-- avisos sean internos. No se eliminan: volverían a hacer falta si algún día se retoma el envío
-- por WhatsApp, y borrar columnas es irreversible.
comment on column public.reminder_preferences.enabled is 'Muestra el aviso de hábitos pendientes dentro de la aplicación.';
comment on column public.reminder_preferences.reminder_time is 'Hora local a partir de la cual se muestra el aviso.';
comment on column public.reminder_preferences.channel is 'Sin uso: los avisos actuales son internos.';
comment on column public.reminder_preferences.phone_number is 'Sin uso: los avisos actuales son internos.';
comment on column public.reminder_preferences.consent_given is 'Sin uso: los avisos internos no requieren consentimiento.';
comment on column public.reminder_preferences.last_reminder_at is 'Sin uso: no hay envíos que registrar.';
