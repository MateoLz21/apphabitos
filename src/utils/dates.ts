export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

/** Número de días del rango, ambos extremos incluidos. Devuelve 0 si el rango está invertido. */
export function daysInclusive(startKey: string, endKey: string) {
  if (endKey < startKey) return 0
  const elapsed = dateFromKey(endKey).getTime() - dateFromKey(startKey).getTime()
  return Math.round(elapsed / 86_400_000) + 1
}

/** Primer día en que el hábito pudo registrarse, acotado al inicio del rango consultado. */
export function trackingStartKey(createdAt: string, rangeStartKey: string) {
  const createdKey = toDateKey(new Date(createdAt))
  return createdKey > rangeStartKey ? createdKey : rangeStartKey
}

export function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start: toDateKey(start), end: toDateKey(end), days: end.getDate() }
}
