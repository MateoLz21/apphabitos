import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'recovery'
const copy: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  login: { title: 'Qué bueno verte', subtitle: 'Ingresa para continuar con tu rutina.', submit: 'Iniciar sesión' },
  signup: { title: 'Crea tu rutina', subtitle: 'Empieza a construir mejores hábitos desde hoy.', submit: 'Crear cuenta' },
  recovery: { title: 'Recupera tu acceso', subtitle: 'Te enviaremos un enlace para restablecer tu contraseña.', submit: 'Enviar enlace' },
}

export function AuthPage({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  const content = copy[mode]
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return
    setSubmitting(true); setError(''); setMessage('')
    try {
      if (mode === 'login') { const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) throw authError }
      else if (mode === 'signup') { const { error: authError } = await supabase.auth.signUp({ email, password }); if (authError) throw authError; setMessage('Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.') }
      else { const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/acceso` }); if (authError) throw authError; setMessage('Si existe una cuenta asociada, recibirás instrucciones en tu correo.') }
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'No se pudo completar la solicitud.') } finally { setSubmitting(false) }
  }
  return <main className="auth-layout"><section className="auth-card">
    <Link to="/acceso" className="brand"><span className="brand-mark">R</span><span>Rutina</span></Link>
    <div className="auth-heading"><h1>{content.title}</h1><p>{content.subtitle}</p></div>
    {!isSupabaseConfigured && <div className="notice notice-warning">Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` para habilitar el acceso.</div>}
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>Correo electrónico<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="tu@correo.com" /></label>
      {mode !== 'recovery' && <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" /></label>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}{message && <p className="notice notice-success" role="status">{message}</p>}
      <button className="primary-button" disabled={!isSupabaseConfigured || submitting} type="submit">{submitting ? 'Procesando…' : content.submit}</button>
    </form>
    <div className="auth-links">{mode === 'login' && <><Link to="/recuperar">¿Olvidaste tu contraseña?</Link><p>¿No tienes una cuenta? <Link to="/registro">Regístrate</Link></p></>}{mode === 'signup' && <p>¿Ya tienes una cuenta? <Link to="/acceso">Inicia sesión</Link></p>}{mode === 'recovery' && <Link to="/acceso">Volver al inicio de sesión</Link>}</div>
  </section></main>
}
