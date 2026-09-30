import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export function ProtectedRoute() {
  const { session, loading, configured } = useAuth()
  if (loading) return <div className="centered-message">Comprobando tu sesión…</div>
  if (!configured) return <Navigate to="/acceso" replace />
  return session ? <Outlet /> : <Navigate to="/acceso" replace />
}
