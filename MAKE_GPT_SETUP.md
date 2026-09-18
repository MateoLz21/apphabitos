# Make + GPT: sugerencias de hábitos

Después de ejecutar la migración `002_habit_suggestions.sql`, crea un **Database Webhook** de Supabase para eventos `INSERT` sobre `public.habit_suggestions` y envíalo a un webhook personalizado de Make.

En Make, el escenario debe:

1. Recibir la solicitud con `id`, `user_id` y `goal`.
2. Actualizar el estado a `processing` usando la API REST de Supabase.
3. Enviar a GPT una instrucción para generar entre 3 y 5 hábitos concretos, medibles, seguros y adecuados para la meta indicada. Cada sugerencia debe incluir nombre, tipo (`boolean` o `quantitative`), unidad opcional y meta diaria opcional.
4. Validar la respuesta y actualizar la misma fila con `status: completed`, `suggestions` como JSON y `completed_at`.
5. Si falla, actualizar `status: failed` y `error_message` sin incluir secretos.

No expongas claves de OpenAI, Make ni la clave `service_role` en el frontend. La automatización debe usar una clave secreta únicamente dentro de Make.
