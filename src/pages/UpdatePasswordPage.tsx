import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Status = 'verifying' | 'ready' | 'invalid' | 'done'

function readParams(source: string) {
  return new URLSearchParams(source.replace(/^[#?]/, ''))
}

export function UpdatePasswordPage() {
  const [status, setStatus] = useState<Status>(isSupabaseConfigured ? 'verifying' : 'invalid')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setError('Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`.')
      return
    }
    let active = true
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        clearTimeout(fallbackTimer)
        setStatus('ready')
      }
    })

    const verifyRecoveryLink = async () => {
      const query = readParams(window.location.search)
      const hash = readParams(window.location.hash)
      const linkError = query.get('error_description') ?? hash.get('error_description')
      if (linkError) {
        if (active) {
          setError(linkError)
          setStatus('invalid')
        }
        return
      }

      // Flujo PKCE: el correo devuelve `?code=` y hay que canjearlo por una sesión de recuperación.
      const code = query.get('code')
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
        if (!active) return
        if (exchangeError) {
          setError('El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.')
          setStatus('invalid')
        } else setStatus('ready')
        return
      }

      const { data } = await client.auth.getSession()
      if (!active) return
      if (data.session) {
        setStatus('ready')
        return
      }
      // Flujo implícito: `detectSessionInUrl` procesa el hash de forma asíncrona; esperamos al evento.
      if (!hash.get('access_token')) {
        setStatus('invalid')
        return
      }
      fallbackTimer = setTimeout(async () => {
        const { data: retry } = await client.auth.getSession()
        if (active) setStatus(retry.session ? 'ready' : 'invalid')
      }, 4000)
    }

    void verifyRecoveryLink()
    return () => {
      active = false
      clearTimeout(fallbackTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setStatus('done')
    } catch (caughtError) {
      const rawMessage = caughtError instanceof Error ? caughtError.message : ''
      const normalizedMessage = rawMessage.toLowerCase()
      if (normalizedMessage.includes('should be different'))
        setError('La nueva contraseña debe ser distinta de la anterior.')
      else if (normalizedMessage.includes('at least'))
        setError('La contraseña es demasiado corta. Usa al menos 6 caracteres.')
      else if (normalizedMessage.includes('session'))
        setError('Tu enlace de recuperación expiró. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».')
      else setError(rawMessage || 'No se pudo actualizar la contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <Link to="/acceso" className="brand">
          <span className="brand-mark">R</span>
          <span>Rutina</span>
        </Link>

        {status === 'verifying' && (
          <>
            <div className="auth-heading">
              <h1>Validando tu enlace</h1>
              <p>Un momento, estamos comprobando el enlace de recuperación.</p>
            </div>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="auth-heading">
              <h1>Enlace no válido</h1>
              <p>Este enlace ya se usó o expiró. Solicita uno nuevo para continuar.</p>
            </div>
            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}
            <div className="auth-links">
              <Link to="/recuperar">Solicitar un enlace nuevo</Link>
              <p>
                <Link to="/acceso">Volver al inicio de sesión</Link>
              </p>
            </div>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="auth-heading">
              <h1>Contraseña actualizada</h1>
              <p>Ya puedes seguir construyendo tu rutina con tu nueva contraseña.</p>
            </div>
            <div className="auth-links">
              <Link to="/hoy">Ir a mis hábitos</Link>
            </div>
          </>
        )}

        {status === 'ready' && (
          <>
            <div className="auth-heading">
              <h1>Define tu nueva contraseña</h1>
              <p>Elige una contraseña que no hayas usado antes.</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              <label>
                Confirma la contraseña
                <input
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                />
              </label>
              {error && (
                <p className="notice notice-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
