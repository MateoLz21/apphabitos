import { AlarmClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToday } from '../contexts/today-context'
import { habitProgress, progressLabel } from '../utils/progress'

export function PendingHabitsNotice() {
  const { reminderDue, pendingHabits, preferences } = useToday()
  if (!reminderDue) return null
  const count = pendingHabits.length
  return (
    <aside className="reminder-notice" role="status">
      <AlarmClock size={21} aria-hidden="true" />
      <div className="reminder-copy">
        <strong>{count === 1 ? 'Te falta 1 hábito por cerrar' : `Te faltan ${count} hábitos por cerrar`}</strong>
        <p>
          {pendingHabits
            .map((habit) => {
              const progress = habitProgress(habit, habit.entry)
              return progress.state === 'partial' ? `${habit.name} (${progressLabel(habit, progress)})` : habit.name
            })
            .join(', ')}
        </p>
        <Link to="/ajustes">Avisarme a otra hora</Link>
      </div>
      <span className="reminder-time">{preferences.reminder_time}</span>
    </aside>
  )
}
