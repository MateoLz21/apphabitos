import { invokeFunction } from '../lib/functions'
import { supabase } from '../lib/supabase'

export type AiSettings = {
  hasKey: boolean
  /** Pista enmascarada, p. ej. `AIza••••••••••••4f2k`. La clave completa nunca sale del servidor. */
  keyHint: string | null
  model: string
  dailyLimit: number
  changedAt: string
}

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

/** La política de `app_admins` solo deja ver la fila propia: si existe, el usuario es administrador. */
export async function isAppAdmin(userId: string) {
  const { data, error } = await getClient().from('app_admins').select('user_id').eq('user_id', userId).maybeSingle()
  // Sin la migración 005 la tabla no existe: se trata como «no administrador» en vez de fallar.
  if (error) return false
  return Boolean(data)
}

export async function getAiSettings(): Promise<AiSettings> {
  const { data, error } = await getClient().rpc('get_ai_settings')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Falta la fila de configuración. Vuelve a ejecutar la migración 005.')
  return {
    hasKey: row.has_key,
    keyHint: row.key_hint,
    model: row.model,
    dailyLimit: row.daily_limit,
    changedAt: row.changed_at,
  }
}

/** Los campos vacíos conservan el valor guardado: se puede cambiar el modelo sin reescribir la clave. */
export async function updateAiSettings(input: { apiKey?: string; model?: string; dailyLimit?: number }) {
  const { error } = await getClient().rpc('update_ai_settings', {
    new_api_key: input.apiKey?.trim() || null,
    new_model: input.model?.trim() || null,
    new_daily_limit: input.dailyLimit ?? null,
  })
  if (error) throw error
}

/** Hace una llamada real a Gemini con la configuración candidata (o la guardada, si se omite). */
export async function testAiSettings(input: { apiKey?: string; model?: string } = {}) {
  return invokeFunction<{ ok: true; model: string }>('suggest-habits', {
    action: 'test',
    apiKey: input.apiKey?.trim() || undefined,
    model: input.model?.trim() || undefined,
  })
}
