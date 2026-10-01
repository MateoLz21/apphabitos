import { invokeFunction } from '../lib/functions'
import type { TrackingType } from '../types/habits'

export type HabitSuggestion = {
  name: string
  tracking_type: TrackingType
  unit?: string
  target_value?: number
  rationale?: string
}

/**
 * Pide sugerencias a la Edge Function `suggest-habits`. La clave de Gemini y el modelo viven en
 * el servidor: el navegador solo envía la meta y recibe los hábitos ya saneados.
 */
export async function requestGeminiSuggestions(goal: string): Promise<HabitSuggestion[]> {
  const { suggestions } = await invokeFunction<{ suggestions: HabitSuggestion[] }>('suggest-habits', {
    goal: goal.trim(),
  })
  return Array.isArray(suggestions) ? suggestions : []
}
