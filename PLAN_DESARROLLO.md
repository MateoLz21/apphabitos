# Plan de desarrollo — Habit Tracker

## Fase 0 — Definición y preparación

- Validar alcance del MVP y arquitectura.
- Preparar repositorio, convenciones y variables de entorno.
- Resultado: base del proyecto documentada y lista para desarrollo.

## Fase 1 — Fundaciones del frontend

- Crear aplicación React + TypeScript + Vite.
- Configurar Tailwind CSS, navegación y estructura de carpetas.
- Definir tema visual responsive y componentes compartidos.
- Resultado: aplicación navegable con diseño base y estados de interfaz.

## Fase 2 — Supabase y autenticación

- Configurar cliente Supabase y variables de entorno.
- Implementar registro, inicio/cierre de sesión y recuperación de contraseña.
- Diseñar esquema SQL, trigger de perfil inicial y políticas RLS.
- Resultado: usuarios aislados y autenticados de forma segura.

**Estado: implementada localmente.** Falta crear el proyecto Supabase, ejecutar la migración y completar `.env` para activar la conexión real.

## Fase 3 — Seguimiento diario de hábitos

- Crear los cuatro hábitos iniciales al registrar un usuario.
- Implementar consulta y guardado de registros diarios booleanos y cuantitativos.
- Construir panel “Hoy”, tarjetas de hábito y progreso diario.
- Resultado: el usuario puede registrar y editar su cumplimiento.

**Estado: implementada.** El panel “Hoy” consulta los hábitos activos y persiste los registros diarios en Supabase.

## Fase 4 — Historial y métricas

- Calcular racha actual, mejor racha y porcentajes de cumplimiento.
- Crear historial mensual tipo calendario/heatmap y vista de estadísticas.
- Resultado: progreso histórico visual y métricas por hábito.

**Estado: implementada.** Historial mensual, heatmap y estadísticas de rachas y cumplimiento disponibles en la aplicación.

## Fase 5 — Recordatorios e integraciones

- Implementar preferencias, consentimiento y zona horaria.
- Documentar y configurar flujos Make + Supabase Webhooks/API + Twilio WhatsApp.
- Resultado: automatización preparada para avisar hábitos pendientes sin exponer secretos.

## Fase 6 — Calidad y despliegue

- Pruebas funcionales, accesibilidad y comportamiento móvil.
- Configuración de Netlify, variables de entorno, README y guía de despliegue.
- Resultado: MVP listo para demostración académica.

## Criterio de avance

Cada fase se verificará localmente antes de iniciar la siguiente. Las integraciones externas que requieran credenciales personales (Supabase, Make y Twilio) quedarán preparadas mediante configuración documentada hasta que se proporcionen esas credenciales.
