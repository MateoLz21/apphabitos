import { BedDouble, CircleDollarSign, Dumbbell, Salad } from 'lucide-react'

const habitPreview = [
  { label: 'Ordenar la cama', detail: 'Empieza el día con orden', icon: BedDouble, tone: 'violet' },
  { label: 'Hacer ejercicio', detail: 'Meta: 30 minutos', icon: Dumbbell, tone: 'orange' },
  { label: 'Comer saludable', detail: 'Elige alimentos que te nutran', icon: Salad, tone: 'green' },
  { label: 'Ahorrar dinero', detail: 'Meta: S/ 5.00', icon: CircleDollarSign, tone: 'blue' },
]

export function TodayPage() {
  const dateLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <section>
      <p className="eyebrow">{dateLabel}</p>
      <h1>Buenos días</h1>
      <p className="subtitle">Un pequeño avance hoy construye una gran rutina.</p>

      <section className="progress-card" aria-label="Progreso de hoy">
        <div>
          <p className="progress-title">Tu progreso de hoy</p>
          <strong>0 de 4 hábitos</strong>
        </div>
        <div className="progress-ring" aria-hidden="true">0%</div>
      </section>

      <div className="section-heading">
        <h2>Hábitos de hoy</h2>
        <span>0 completados</span>
      </div>
      <div className="habit-list">
        {habitPreview.map(({ label, detail, icon: Icon, tone }) => (
          <article key={label} className="habit-card">
            <span className={`habit-icon ${tone}`}><Icon aria-hidden="true" size={23} /></span>
            <div className="habit-copy"><h3>{label}</h3><p>{detail}</p></div>
            <button className="check-button" type="button" aria-label={`Marcar ${label} como cumplido`} />
          </article>
        ))}
      </div>
    </section>
  )
}
