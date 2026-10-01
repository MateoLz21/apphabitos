import type { Habit } from '../types/habits'

export type ProgressState = 'done' | 'partial' | 'none'

export type HabitProgress = {
  state: ProgressState
  /** Total acumulado del día. Siempre 0 en hábitos de sí/no. */
  value: number
  /** Meta diaria. 0 en hábitos de sí/no. */
  target: number
  /** Fracción cumplida, entre 0 y 1. Es lo que pinta la barra y el color del calendario. */
  ratio: number
}

type EntryLike = { completed: boolean; numeric_value: number | null } | undefined

/** Avance de un hábito en un día a partir de su registro (o de la ausencia de registro). */
export function habitProgress(habit: Pick<Habit, 'tracking_type' | 'target_value'>, entry: EntryLike): HabitProgress {
  if (habit.tracking_type !== 'quantitative') {
    const done = Boolean(entry?.completed)
    return { state: done ? 'done' : 'none', value: 0, target: 0, ratio: done ? 1 : 0 }
  }
  const value = Math.max(0, Number(entry?.numeric_value ?? 0) || 0)
  const target = Math.max(0, Number(habit.target_value ?? 0) || 0)
  const done = Boolean(entry?.completed) || (target > 0 && value >= target)
  if (done) return { state: 'done', value, target, ratio: 1 }
  if (value > 0) return { state: 'partial', value, target, ratio: target > 0 ? value / target : 0 }
  return { state: 'none', value: 0, target, ratio: 0 }
}

/** Convierte lo que el usuario escribe en una cantidad válida, o `null` si no lo es. */
export function parseAmount(text: string, { allowZero = false } = {}) {
  const amount = Number(text.replace(',', '.'))
  if (text.trim() === '' || !Number.isFinite(amount) || amount < 0) return null
  if (amount === 0 && !allowZero) return null
  return roundAmount(amount)
}

/** Dos decimales como máximo: evita totales como 0.30000000000000004 al sumar. */
export function roundAmount(amount: number) {
  return Math.round(amount * 100) / 100
}

/** `10`, `2.5`: sin decimales sobrantes. */
export function formatAmount(amount: number) {
  return String(roundAmount(amount))
}

/** Texto del tipo «10 de 30 minutos». */
export function progressLabel(habit: Pick<Habit, 'unit'>, progress: HabitProgress) {
  return `${formatAmount(progress.value)} de ${formatAmount(progress.target)} ${habit.unit ?? ''}`.trim()
}

/**
 * Nivel de color (0 a 4) de un día del calendario. Los avances parciales cuentan por su fracción,
 * así un día con todo a medias no se ve igual que un día sin nada.
 */
export function dayLevel(ratios: number[], expected: number) {
  if (expected <= 0) return 0
  const score = ratios.reduce((total, ratio) => total + ratio, 0) / expected
  if (score <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil(score * 4)))
}
