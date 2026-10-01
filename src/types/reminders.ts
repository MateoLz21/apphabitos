/**
 * Preferencias de los avisos dentro de la aplicación. La tabla `reminder_preferences` nació para
 * recordatorios por WhatsApp, así que conserva columnas que hoy no se usan (`channel`,
 * `phone_number`, `consent_given`, `last_reminder_at`): los avisos son internos y no envían nada.
 */
export type ReminderPreferences = {
  enabled: boolean
  /** Hora local a partir de la cual se muestra el aviso, en formato `HH:MM`. */
  reminder_time: string
  timezone: string
}

export const defaultReminderPreferences: ReminderPreferences = {
  enabled: true,
  reminder_time: '20:00',
  timezone: 'America/Lima',
}
