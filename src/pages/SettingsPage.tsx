import { AlarmClock, CircleUserRound, Globe, LoaderCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { AiSettingsCard } from '../components/AiSettingsCard'
import { useAuth } from '../contexts/auth-context'
import { useToday } from '../contexts/today-context'
import { isAppAdmin } from '../services/aiSettings'
import { saveProfileName } from '../services/profile'
import { saveReminderPreferences } from '../services/reminders'
import { deviceTimeZone, timeInZone } from '../utils/reminders'

/** Zonas frecuentes entre los usuarios de la aplicación. La del dispositivo se añade si falta. */
const COMMON_ZONES = [
  'America/Lima',
  'America/Bogota',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'Europe/Madrid',
  'UTC',
]

export function SettingsPage() {
  const { session } = useAuth()
  const { preferences, applyPreferences, pendingHabits, displayName, applyDisplayName } = useToday()
  const [enabled, setEnabled] = useState(preferences.enabled)
  const [reminderTime, setReminderTime] = useState(preferences.reminder_time)
  const [timezone, setTimezone] = useState(preferences.timezone)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [nameDraft, setNameDraft] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState('')
  const [nameError, setNameError] = useState('')

  // El nombre llega del servidor después del primer render; se copia al campo cuando aparece.
  useEffect(() => {
    setNameDraft(displayName)
  }, [displayName])

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setSavingName(true)
    setNameError('')
    setNameMessage('')
    try {
      applyDisplayName(await saveProfileName(session.user.id, nameDraft))
      setNameMessage('Nombre guardado.')
    } catch (caughtError) {
      setNameError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el nombre.')
    } finally {
      setSavingName(false)
    }
  }

  const [isAdmin, setIsAdmin] = useState(false)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let active = true
    void isAppAdmin(userId).then((value) => {
      if (active) setIsAdmin(value)
    })
    return () => {
      active = false
    }
  }, [userId])

  const zones = Array.from(new Set([...COMMON_ZONES, deviceTimeZone(), timezone])).sort()
  const currentTime = timeInZone(timezone, new Date())
  const alreadyReached = currentTime >= reminderTime

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveReminderPreferences(session.user.id, { enabled, reminder_time: reminderTime, timezone })
      applyPreferences(saved)
      setMessage('Preferencias guardadas.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron guardar las preferencias.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <p className="eyebrow">Tu cuenta</p>
      <h1>Ajustes</h1>
      <p className="subtitle">Tu cuenta y los avisos de la aplicación.</p>

      <section className="settings-card">
        <div className="settings-heading">
          <CircleUserRound size={20} aria-hidden="true" />
          <div>
            <h2>Tu cuenta</h2>
            <p>El nombre aparece en el encabezado, junto al botón de salir.</p>
          </div>
        </div>
        <form className="settings-form" onSubmit={saveName}>
          <label>
            Correo
            <input type="text" value={session?.user.email ?? ''} readOnly disabled />
          </label>
          <label>
            Nombre
            <input
              type="text"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={60}
              autoComplete="name"
              placeholder="Cómo quieres que te llamemos"
              required
            />
          </label>
          {nameError && (
            <p className="notice notice-error" role="alert">
              {nameError}
            </p>
          )}
          {nameMessage && (
            <p className="notice notice-success" role="status">
              {nameMessage}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={savingName}>
            {savingName ? 'Guardando…' : 'Guardar nombre'}
          </button>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <AlarmClock size={20} aria-hidden="true" />
          <div>
            <h2>Aviso de hábitos pendientes</h2>
            <p>
              El aviso aparece dentro de la aplicación, en «Hoy» y en el menú superior. No se envía ningún mensaje ni
              correo.
            </p>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="settings-switch">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            <span>Mostrarme avisos de lo que queda pendiente</span>
          </label>

          <label>
            Avisarme a partir de
            <input
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
              disabled={!enabled}
              required
            />
          </label>

          <label>
            Zona horaria
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={!enabled}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>

          <p className="settings-hint">
            <Globe size={15} aria-hidden="true" />
            Ahí son las {currentTime}.{' '}
            {enabled
              ? alreadyReached
                ? `Con esta hora, el aviso ya estaría visible${pendingHabits.length ? '' : ' si quedara algo pendiente'}.`
                : 'Todavía no es hora, así que no verás el aviso.'
              : 'Los avisos están desactivados.'}
          </p>

          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice notice-success" role="status">
              {message}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spinner" size={17} /> : null}
            {saving ? 'Guardando…' : 'Guardar preferencias'}
          </button>
        </form>
      </section>

      {isAdmin && <AiSettingsCard />}
    </section>
  )
}
