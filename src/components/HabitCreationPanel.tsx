import { Lightbulb, LoaderCircle, Plus, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { requestGeminiSuggestions, type HabitSuggestion } from '../services/gemini'
import { createHabit } from '../services/habits'
import type { Habit } from '../types/habits'

type Props = { userId: string; onCreated: (habit: Habit) => void }

export function HabitCreationPanel({ userId, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [trackingType, setTrackingType] = useState<'boolean' | 'quantitative'>('boolean')
  const [unit, setUnit] = useState('minutos')
  const [target, setTarget] = useState('30')
  const [goal, setGoal] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [asking, setAsking] = useState(false)
  const [suggestions, setSuggestions] = useState<HabitSuggestion[]>([])
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null)
  function close() {
    setOpen(false)
    setMessage('')
    setError('')
    setSuggestions([])
  }
  async function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const habit = await createHabit({ userId, name, trackingType, unit, targetValue: Number(target) })
      onCreated(habit)
      setName('')
      setMessage('Hábito agregado a tu día.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear el hábito.')
    } finally {
      setSaving(false)
    }
  }
  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAsking(true)
    setError('')
    setMessage('')
    setSuggestions([])
    try {
      const result = await requestGeminiSuggestions(goal)
      if (result.length === 0) {
        setError('Gemini no encontró hábitos para esa meta. Prueba a describirla de otra forma.')
        return
      }
      setSuggestions(result)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron obtener sugerencias.')
    } finally {
      setAsking(false)
    }
  }

  async function addSuggestion(suggestion: HabitSuggestion) {
    setAddingSuggestion(suggestion.name)
    setError('')
    setMessage('')
    try {
      const habit = await createHabit({
        userId,
        name: suggestion.name,
        trackingType: suggestion.tracking_type,
        unit: suggestion.unit,
        targetValue: suggestion.target_value,
      })
      onCreated(habit)
      setSuggestions((current) => current.filter((item) => item.name !== suggestion.name))
      setMessage(`«${suggestion.name}» agregado a tu día.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear el hábito sugerido.')
    } finally {
      setAddingSuggestion(null)
    }
  }
  return (
    <>
      <button type="button" className="add-habit-button" onClick={() => setOpen(true)}>
        <Plus size={18} /> Añadir hábito
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <section className="creation-panel" role="dialog" aria-modal="true" aria-labelledby="habit-panel-title">
            <button className="panel-close" type="button" onClick={close} aria-label="Cerrar">
              <X />
            </button>
            <p className="eyebrow">Personaliza tu rutina</p>
            <h2 id="habit-panel-title">Nuevo hábito</h2>
            <form className="creation-form" onSubmit={submitHabit}>
              <label>
                Nombre del hábito
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Leer 20 páginas"
                  required
                  maxLength={60}
                />
              </label>
              <label>
                ¿Cómo lo registrarás?
                <select
                  value={trackingType}
                  onChange={(event) => setTrackingType(event.target.value as 'boolean' | 'quantitative')}
                >
                  <option value="boolean">Completado / no completado</option>
                  <option value="quantitative">Cantidad diaria</option>
                </select>
              </label>
              {trackingType === 'quantitative' && (
                <div className="form-row">
                  <label>
                    Meta
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Unidad
                    <input
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                      placeholder="minutos"
                      required
                      maxLength={20}
                    />
                  </label>
                </div>
              )}
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? 'Guardando…' : 'Crear hábito'}
              </button>
            </form>
            <div className="assistant-divider">
              <span />
            </div>
            <div className="goal-helper">
              <Lightbulb size={19} />
              <div>
                <h3>Sugerencias para una meta</h3>
                <p>Describe qué quieres lograr y Gemini propondrá hábitos diarios concretos.</p>
              </div>
            </div>
            <form className="goal-form" onSubmit={submitGoal}>
              <input
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Ej. Quiero mejorar mi concentración"
                required
                maxLength={300}
                disabled={asking}
              />
              <button type="submit" disabled={asking}>
                {asking ? <LoaderCircle className="spinner" size={17} /> : <Sparkles size={17} />}
                {asking ? 'Pensando…' : 'Pedir ideas'}
              </button>
            </form>
            {suggestions.length > 0 && (
              <ul className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.name} className="suggestion-item">
                    <div className="suggestion-copy">
                      <strong>{suggestion.name}</strong>
                      {suggestion.rationale && <p>{suggestion.rationale}</p>}
                      <span className="suggestion-meta">
                        {suggestion.tracking_type === 'quantitative'
                          ? `Meta diaria: ${suggestion.target_value} ${suggestion.unit}`
                          : 'Completado / no completado'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="suggestion-add"
                      onClick={() => void addSuggestion(suggestion)}
                      disabled={addingSuggestion !== null}
                      aria-label={`Agregar ${suggestion.name}`}
                    >
                      {addingSuggestion === suggestion.name ? (
                        <LoaderCircle className="spinner" size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
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
        </div>
      )}
    </>
  )
}
