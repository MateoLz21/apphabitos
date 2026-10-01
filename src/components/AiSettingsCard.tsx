import { KeyRound, LoaderCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getAiSettings, testAiSettings, updateAiSettings, type AiSettings } from '../services/aiSettings'

/**
 * Modelos de texto de Gemini que se ofrecen en el selector. La lista es fija a propósito: el
 * listado de la API de Google incluye modelos que una clave nueva no puede invocar, así que no
 * sirve como fuente. «Probar y guardar» confirma con una llamada real que el elegido funciona.
 */
const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (recomendado)' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (más ligero)' },
  { id: 'gemini-flash-latest', label: 'Flash más reciente (lo elige Google)' },
  { id: 'gemini-pro-latest', label: 'Pro más reciente (más lento y costoso)' },
]

/**
 * Configuración general de la IA, visible solo para administradores. La clave se escribe pero
 * nunca se vuelve a leer: el servidor devuelve únicamente una pista enmascarada.
 */
export function AiSettingsCard() {
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [model, setModel] = useState('')
  const [dailyLimit, setDailyLimit] = useState('10')
  const [keyDraft, setKeyDraft] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Si el modelo guardado ya no está en la lista (se configuró por SQL o la lista quedó vieja),
  // se muestra igualmente para no cambiarlo sin querer al guardar.
  const modelOptions = GEMINI_MODELS.some((option) => option.id === model)
    ? GEMINI_MODELS
    : [{ id: model, label: model }, ...GEMINI_MODELS]

  function apply(next: AiSettings) {
    setSettings(next)
    setModel(next.model)
    setDailyLimit(String(next.dailyLimit))
  }

  useEffect(() => {
    let active = true
    getAiSettings()
      .then((next) => {
        if (active) apply(next)
      })
      .catch((caughtError) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la configuración.')
      })
    return () => {
      active = false
    }
  }, [])

  // Antes de guardar se prueba la configuración candidata contra Gemini: así un modelo retirado o
  // una clave mal copiada no dejan las sugerencias caídas para todos los usuarios.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('save')
    setError('')
    setMessage('')
    try {
      await testAiSettings({ apiKey: keyDraft, model })
      await updateAiSettings({ apiKey: keyDraft, model, dailyLimit: Number(dailyLimit) })
      apply(await getAiSettings())
      setKeyDraft('')
      setMessage('Configuración probada con Gemini y guardada. Ya aplica a todos los usuarios.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar la configuración.')
    } finally {
      setBusy(null)
    }
  }

  async function handleTest() {
    setBusy('test')
    setError('')
    setMessage('')
    try {
      const result = await testAiSettings()
      setMessage(`La configuración guardada funciona con «${result.model}».`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'La prueba falló.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="settings-card">
      <div className="settings-heading">
        <KeyRound size={20} aria-hidden="true" />
        <div>
          <h2>Inteligencia artificial</h2>
          <p>
            Una sola clave de Gemini para toda la aplicación. Solo los administradores ven esta sección; la clave se
            guarda en el servidor y no se muestra de nuevo.
          </p>
        </div>
      </div>

      {!settings && !error && (
        <p className="settings-hint">
          <LoaderCircle className="spinner" size={15} aria-hidden="true" /> Cargando configuración…
        </p>
      )}

      {settings && (
        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="key-row">
            <code className="key-mask">{settings.keyHint ?? 'Sin clave configurada'}</code>
            <button
              type="button"
              className="key-ghost"
              onClick={handleTest}
              disabled={busy !== null || !settings.hasKey}
            >
              {busy === 'test' && <LoaderCircle className="spinner" size={15} />}
              Probar
            </button>
          </div>

          <label>
            {settings.hasKey ? 'Reemplazar clave (déjalo vacío para conservarla)' : 'Clave de API'}
            <input
              type="password"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder="AIza…"
              autoComplete="off"
              spellCheck={false}
              required={!settings.hasKey}
            />
          </label>

          <label>
            Modelo
            <select value={model} onChange={(event) => setModel(event.target.value)} required>
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Solicitudes por usuario cada 24 horas
            <input
              type="number"
              min="1"
              max="500"
              step="1"
              value={dailyLimit}
              onChange={(event) => setDailyLimit(event.target.value)}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={busy !== null}>
            {busy === 'save' && <LoaderCircle className="spinner" size={17} />}
            {busy === 'save' ? 'Probando y guardando…' : 'Probar y guardar'}
          </button>
        </form>
      )}

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
    </section>
  )
}
