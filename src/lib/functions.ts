import { supabase } from './supabase'

/**
 * Invoca una Edge Function y devuelve su cuerpo. Cuando la función responde con un estado de
 * error, `supabase-js` solo informa «non-2xx status code»; el mensaje útil va en el cuerpo de la
 * respuesta (`{ error }`), así que se extrae de ahí.
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = 'No se pudo contactar con el servidor. Inténtalo de nuevo.'
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      if (context.status === 404) message = `La función «${name}» no está desplegada en Supabase.`
      try {
        const payload = await context.json()
        if (typeof payload?.error === 'string') message = payload.error
      } catch {
        // Cuerpo vacío o no JSON: se conserva el mensaje genérico.
      }
    }
    throw new Error(message)
  }
  return data as T
}
