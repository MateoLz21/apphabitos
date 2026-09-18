import { Lightbulb, Plus, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { createHabit, requestHabitSuggestions } from '../services/habits'
import type { Habit } from '../types/habits'

type Props = { userId: string; onCreated: (habit: Habit) => void }

export function HabitCreationPanel({ userId, onCreated }: Props) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [trackingType, setTrackingType] = useState<'boolean' | 'quantitative'>('boolean')
  const [unit, setUnit] = useState('minutos'); const [target, setTarget] = useState('30'); const [goal, setGoal] = useState('')
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  function close() { setOpen(false); setMessage(''); setError('') }
  async function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try { const habit = await createHabit({ userId, name, trackingType, unit, targetValue: Number(target) }); onCreated(habit); setName(''); setMessage('Hábito agregado a tu día.') }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear el hábito.') } finally { setSaving(false) }
  }
  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try { await requestHabitSuggestions({ userId, goal }); setGoal(''); setMessage('Meta enviada. Make procesará sugerencias con GPT cuando configuremos la automatización.') }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar la meta. Ejecuta antes la migración de sugerencias.') } finally { setSaving(false) }
  }
  return <><button type="button" className="add-habit-button" onClick={() => setOpen(true)}><Plus size={18} /> Añadir hábito</button>
    {open && <div className="modal-backdrop" role="presentation"><section className="creation-panel" role="dialog" aria-modal="true" aria-labelledby="habit-panel-title"><button className="panel-close" type="button" onClick={close} aria-label="Cerrar"><X /></button><p className="eyebrow">Personaliza tu rutina</p><h2 id="habit-panel-title">Nuevo hábito</h2>
      <form className="creation-form" onSubmit={submitHabit}><label>Nombre del hábito<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Leer 20 páginas" required maxLength={60} /></label><label>¿Cómo lo registrarás?<select value={trackingType} onChange={(event) => setTrackingType(event.target.value as 'boolean' | 'quantitative')}><option value="boolean">Completado / no completado</option><option value="quantitative">Cantidad diaria</option></select></label>{trackingType === 'quantitative' && <div className="form-row"><label>Meta<input type="number" min="1" step="1" value={target} onChange={(event) => setTarget(event.target.value)} required /></label><label>Unidad<input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="minutos" required maxLength={20} /></label></div>}<button className="primary-button" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Crear hábito'}</button></form>
      <div className="assistant-divider"><span /></div><div className="goal-helper"><Lightbulb size={19} /><div><h3>Sugerencias para una meta</h3><p>Cuando Make + GPT estén configurados, recibirás hábitos recomendados.</p></div></div><form className="goal-form" onSubmit={submitGoal}><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Ej. Quiero mejorar mi concentración" required maxLength={300} /><button type="submit" disabled={saving}><Sparkles size={17} /> Pedir ideas</button></form>
      {error && <p className="notice notice-error" role="alert">{error}</p>}{message && <p className="notice notice-success" role="status">{message}</p>}
    </section></div>}
  </>
}
