// Edge Function de Supabase (Deno). Es el único lugar donde se usa la clave de Gemini: la lee de
// `app_settings` con la clave `service_role` y nunca la devuelve al navegador.
//
// POST { goal }                       -> { suggestions }   cualquier usuario con sesión
// POST { action: 'test', apiKey?, model? } -> { ok, model }  solo administradores; prueba la
//                                          configuración guardada o una candidata antes de guardarla
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Suggestion = {
  name: string
  tracking_type: 'boolean' | 'quantitative'
  unit?: string
  target_value?: number
  rationale?: string
}

type GeminiResult = { ok: true; suggestions: Suggestion[] } | { ok: false; status: number; reason: string }

// `minItems` y los campos obligatorios hacen que el modelo no pueda responder con un solo hábito
// ni omitir la explicación, que es lo que tienden a hacer los modelos más ligeros.
const responseSchema = {
  type: 'ARRAY',
  minItems: 3,
  maxItems: 5,
  items: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'Hábito en infinitivo, máximo 60 caracteres.' },
      tracking_type: { type: 'STRING', enum: ['boolean', 'quantitative'] },
      unit: { type: 'STRING', description: 'Una sola palabra: minutos, páginas, vasos, pasos, soles.' },
      target_value: { type: 'NUMBER', description: 'Cantidad diaria. Solo para quantitative.' },
      rationale: { type: 'STRING', description: 'Beneficio concreto para la meta, en una o dos frases.' },
    },
    required: ['name', 'tracking_type', 'rationale'],
    propertyOrdering: ['name', 'tracking_type', 'unit', 'target_value', 'rationale'],
  },
}

const instructions = `Eres un asistente que diseña hábitos diarios para una aplicación de seguimiento.
A partir de la meta del usuario, propón siempre entre 3 y 5 hábitos diarios distintos entre sí.

Reglas:
- Concretos, medibles y alcanzables en un día.
- "name" en español, máximo 60 caracteres, en infinitivo (ej. "Caminar 20 minutos").
- "tracking_type" es "quantitative" si tiene sentido medir una cantidad diaria, si no "boolean".
- Para "quantitative": incluye "target_value" realista y "unit" de UNA sola palabra
  (minutos, páginas, vasos, pasos, soles). Nunca escribas frases dentro de "unit".
- Para "boolean": no incluyas "unit" ni "target_value".
- "rationale" es obligatorio: una o dos frases (máximo 200 caracteres) que expliquen el beneficio
  concreto del hábito para esa meta, dirigidas a la persona.

Salud y bienestar:
- Las metas de salud, peso, alimentación o ejercicio son válidas y frecuentes: respóndelas siempre
  con hábitos saludables y sostenibles (moverse, hidratarse, comer verduras, dormir bien, cocinar en casa).
- No propongas ayunos, dietas restrictivas, conteo de calorías, suplementos, medicación ni cifras de
  peso que alcanzar; el hábito es la conducta diaria, no el resultado.

Devuelve una lista vacía solo si el texto no es una meta (sin sentido o sin relación con hábitos) o
si pide algo que dañe a la persona o a otros.`

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

// Los modelos ligeros a veces pegan texto sobrante en la unidad. Se conserva solo la primera
// palabra, y si aun así es demasiado larga para ser una unidad real, se usa una genérica.
function cleanUnit(raw: unknown) {
  const word = String(raw ?? '').trim().split(/\s+/)[0]?.replace(/[^\p{L}%°]/gu, '') ?? ''
  return word.length >= 1 && word.length <= 12 ? word.toLowerCase() : 'unidades'
}

// La respuesta de un modelo no es de fiar y termina en la base: se recorta y se normaliza.
function sanitize(raw: unknown): Suggestion[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const quantitative = item.tracking_type === 'quantitative'
      const target = Number(item.target_value)
      const suggestion: Suggestion = {
        name: String(item.name ?? '').trim().slice(0, 60),
        tracking_type: quantitative ? 'quantitative' : 'boolean',
      }
      if (quantitative) {
        suggestion.unit = cleanUnit(item.unit)
        suggestion.target_value = Number.isFinite(target) && target > 0 ? Math.round(target) : 1
      }
      if (item.rationale) suggestion.rationale = String(item.rationale).trim().slice(0, 220)
      return suggestion
    })
    .filter((suggestion) => suggestion.name.length > 1)
    .slice(0, 5)
}

// Google responde 503 cuando el modelo está saturado; suele pasar en segundos. Se reintenta con
// una espera corta antes de darlo por fallido.
const RETRY_DELAYS_MS = [800, 2000]

async function callGemini(apiKey: string, model: string, goal: string): Promise<GeminiResult> {
  const send = () =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: 'user', parts: [{ text: `Meta del usuario: ${goal}` }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema },
      }),
    })

  let response = await send()
  for (const delay of RETRY_DELAYS_MS) {
    if (response.status !== 503) break
    await response.body?.cancel()
    await new Promise((resolve) => setTimeout(resolve, delay))
    response = await send()
  }
  if (!response.ok) {
    let reason = ''
    try {
      reason = (await response.json())?.error?.message ?? ''
    } catch {
      reason = ''
    }
    return { ok: false, status: response.status, reason: reason || `Gemini respondió ${response.status}.` }
  }
  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { ok: false, status: 502, reason: 'Gemini no devolvió contenido.' }
  try {
    return { ok: true, suggestions: sanitize(JSON.parse(text)) }
  } catch {
    return { ok: false, status: 502, reason: 'La respuesta de Gemini no era JSON válido.' }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno de la función.')
    return json(500, {
      error: 'La función no tiene acceso a SUPABASE_SERVICE_ROLE_KEY. Revisa Edge Functions > Secrets.',
    })
  }
  const admin = createClient(supabaseUrl, serviceKey)

  // La identidad sale del JWT del usuario, nunca de un `user_id` enviado en el cuerpo.
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: userData } = await admin.auth.getUser(token)
  const user = userData?.user
  if (!user) return json(401, { error: 'Inicia sesión para pedir sugerencias.' })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Solicitud no válida.' })
  }

  const { data: settings, error: settingsError } = await admin
    .from('app_settings')
    .select('gemini_api_key, gemini_model, daily_suggestion_limit')
    .eq('id', true)
    .maybeSingle()
  if (settingsError || !settings) {
    console.error('app_settings no disponible', settingsError)
    return json(500, { error: 'Falta la configuración de IA. Ejecuta la migración 005.' })
  }

  if (body.action === 'test') {
    const { data: adminRow } = await admin.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json(403, { error: 'Solo un administrador puede probar la configuración.' })
    const apiKey = String(body.apiKey ?? '').trim() || settings.gemini_api_key || ''
    const model = String(body.model ?? '').trim() || settings.gemini_model
    if (!apiKey) return json(400, { error: 'Todavía no hay ninguna clave que probar.' })
    const result = await callGemini(apiKey, model, 'quiero dormir mejor')
    // Al administrador sí se le muestra el motivo exacto de Google: es quien puede corregirlo.
    if (!result.ok) return json(400, { error: `Google rechazó la prueba con «${model}»: ${result.reason}` })
    return json(200, { ok: true, model })
  }

  const goal = String(body.goal ?? '').trim()
  if (goal.length < 3 || goal.length > 300) {
    return json(400, { error: 'Describe tu meta en entre 3 y 300 caracteres.' })
  }
  if (!settings.gemini_api_key) {
    return json(503, { error: 'Las sugerencias aún no están activadas. Avisa al administrador.' })
  }

  // La clave es compartida, así que cada usuario tiene un tope diario de solicitudes atendidas.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('habit_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('created_at', since)
  if ((count ?? 0) >= settings.daily_suggestion_limit) {
    return json(429, {
      error: `Llegaste al límite de ${settings.daily_suggestion_limit} solicitudes de sugerencias en 24 horas.`,
    })
  }

  const result = await callGemini(settings.gemini_api_key, settings.gemini_model, goal)
  if (!result.ok) {
    // El detalle (clave inválida, cuota, modelo retirado) se registra, pero no se muestra al usuario.
    console.error('Gemini falló', result.status, result.reason)
    await admin
      .from('habit_suggestions')
      .insert({ user_id: user.id, goal, status: 'failed', error_message: result.reason.slice(0, 500) })
    return json(502, {
      error:
        result.status === 503
          ? 'Gemini está saturado en este momento. Inténtalo de nuevo en unos segundos.'
          : 'El servicio de sugerencias no está disponible ahora. Inténtalo más tarde.',
    })
  }

  await admin.from('habit_suggestions').insert({
    user_id: user.id,
    goal,
    status: 'completed',
    suggestions: result.suggestions,
    completed_at: new Date().toISOString(),
  })
  return json(200, { suggestions: result.suggestions })
})
