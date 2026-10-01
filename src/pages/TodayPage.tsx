import { BedDouble, Check, CircleCheckBig, CircleDollarSign, Dumbbell, LoaderCircle, Salad, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HabitCreationPanel } from '../components/HabitCreationPanel'
import { PendingHabitsNotice } from '../components/PendingHabitsNotice'
import { useAuth } from '../contexts/auth-context'
import { useToday } from '../contexts/today-context'
import { saveHabitEntry } from '../services/habits'
import type { HabitWithEntry } from '../types/habits'

const icons = {
  'bed-double': BedDouble,
  dumbbell: Dumbbell,
  salad: Salad,
  'circle-dollar-sign': CircleDollarSign,
  'circle-check': CircleCheckBig,
}

/** Saludo según la hora local del dispositivo. */
function greeting(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function TodayPage() {
  const { session } = useAuth()
  const { entryDate, habits, loading, error: loadError, applyEntry, addHabit } = useToday()
  const [saveError, setSaveError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const error = loadError || saveError

  // Los campos numéricos se siembran con lo ya guardado, pero sin pisar lo que el usuario esté
  // escribiendo en otro hábito cuando la lista se actualiza tras un guardado.
  useEffect(() => {
    setValues((current) =>
      Object.fromEntries(
        habits
          .filter((habit) => habit.tracking_type === 'quantitative')
          .map((habit) => [habit.id, current[habit.id] ?? habit.entry?.numeric_value?.toString() ?? '']),
      ),
    )
  }, [habits])

  const completedCount = habits.filter((habit) => habit.entry?.completed).length
  const progress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0
  const dateLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(),
  )
  // Se recalcula en cada render, así el saludo se corrige al cruzar el mediodía o la noche con la app abierta.
  const salutation = greeting(new Date().getHours())

  async function persist(habit: HabitWithEntry, numericValue?: number | null, completed?: boolean) {
    if (!session) return
    setSavingId(habit.id)
    setSaveError('')
    try {
      const entry = await saveHabitEntry({ userId: session.user.id, habit, entryDate, numericValue, completed })
      applyEntry(habit.id, entry)
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el hábito. Inténtalo de nuevo.',
      )
    } finally {
      setSavingId(null)
    }
  }

  if (loading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spinner" aria-hidden="true" /> Cargando tus hábitos…
      </div>
    )

  return (
    <section>
      <p className="eyebrow">{dateLabel}</p>
      <h1>{salutation}</h1>
      <p className="subtitle">Un pequeño avance hoy construye una gran rutina.</p>

      <section className="progress-card" aria-label="Progreso de hoy">
        <div>
          <p className="progress-title">Tu progreso de hoy</p>
          <strong>
            {completedCount} de {habits.length} hábitos
          </strong>
        </div>
        <div
          className="progress-ring"
          style={{ background: `conic-gradient(#fff ${progress}%, #ffffff52 0)` }}
          aria-label={`${progress}% completado`}
        >
          <span>{progress}%</span>
        </div>
      </section>

      <PendingHabitsNotice />

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <div className="section-heading">
        <h2>Hábitos de hoy</h2>
        <span>{completedCount} completados</span>
      </div>
      {session && <HabitCreationPanel userId={session.user.id} onCreated={addHabit} />}
      {habits.length === 0 ? (
        <div className="placeholder-card">
          <h2>Aún no hay hábitos activos</h2>
          <p>Revisa la configuración de tu cuenta o vuelve a iniciar sesión.</p>
        </div>
      ) : (
        <div className="habit-list">
          {habits.map((habit) => {
            const Icon = icons[habit.icon as keyof typeof icons] ?? CircleCheckBig
            const isCompleted = Boolean(habit.entry?.completed)
            const isSaving = savingId === habit.id
            const value = values[habit.id] ?? ''
            return (
              <article key={habit.id} className={`habit-card ${isCompleted ? 'is-completed' : ''}`}>
                <span className="habit-icon" style={{ color: habit.color, backgroundColor: `${habit.color}1a` }}>
                  <Icon aria-hidden="true" size={23} />
                </span>
                <div className="habit-copy">
                  <h3>{habit.name}</h3>
                  <p>
                    {habit.tracking_type === 'quantitative'
                      ? `Meta: ${habit.target_value ?? 0} ${habit.unit ?? ''}`
                      : habit.description}
                  </p>
                  {habit.tracking_type === 'quantitative' && (
                    <div className="quantity-control">
                      <input
                        aria-label={`Valor de ${habit.name}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={value}
                        onChange={(event) => setValues((current) => ({ ...current, [habit.id]: event.target.value }))}
                      />
                      <span>{habit.unit}</span>
                      <button
                        type="button"
                        className="save-value"
                        disabled={isSaving || value === ''}
                        onClick={() => void persist(habit, Math.round(Number(value)))}
                      >
                        {isSaving ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}
                        <span>Guardar</span>
                      </button>
                    </div>
                  )}
                </div>
                {habit.tracking_type === 'boolean' && (
                  <button
                    className="check-button"
                    type="button"
                    disabled={isSaving}
                    aria-pressed={isCompleted}
                    aria-label={`${isCompleted ? 'Desmarcar' : 'Marcar'} ${habit.name}`}
                    onClick={() => void persist(habit, undefined, !isCompleted)}
                  >
                    {isSaving ? (
                      <LoaderCircle className="spinner" size={16} />
                    ) : (
                      isCompleted && <Check size={17} aria-hidden="true" />
                    )}
                  </button>
                )}
                {habit.tracking_type === 'quantitative' && isCompleted && (
                  <span className="completed-badge">
                    <Check size={15} aria-hidden="true" /> Meta lograda
                  </span>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
