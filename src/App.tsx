import { CalendarDays, ChartNoAxesCombined, CircleCheckBig, LogOut, Settings } from 'lucide-react'
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './contexts/auth-context'
import { TodayProvider } from './contexts/TodayProvider'
import { useToday } from './contexts/today-context'
import { AuthPage } from './pages/AuthPage'
import { TodayPage } from './pages/TodayPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { UpdatePasswordPage } from './pages/UpdatePasswordPage'

const navigation = [
  { to: '/hoy', label: 'Hoy', icon: CircleCheckBig },
  { to: '/historial', label: 'Historial', icon: CalendarDays },
  { to: '/estadisticas', label: 'Estadísticas', icon: ChartNoAxesCombined },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

function ApplicationLayout() {
  const { signOut } = useAuth()
  const { reminderDue, pendingHabits } = useToday()
  const pendingCount = pendingHabits.length
  return (
    <div className="app-shell">
      {/* Encabezado y menú viajan juntos y quedan pegados arriba al desplazar la página. */}
      <div className="app-header">
        <header className="topbar">
          <NavLink to="/hoy" className="brand" aria-label="Rutina, ir al inicio">
            <span className="brand-mark">R</span>
            <span>Rutina</span>
          </NavLink>
          <button type="button" className="sign-out" onClick={() => void signOut()}>
            <LogOut size={18} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </header>
        <nav className="top-nav" aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon }) => {
            // El contador solo acompaña a «Hoy»: es la pantalla donde se resuelve lo pendiente.
            const showBadge = to === '/hoy' && reminderDue
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                aria-label={showBadge ? `${label}, ${pendingCount} pendientes` : undefined}
              >
                <span className="nav-icon">
                  <Icon aria-hidden="true" size={21} />
                  {showBadge && (
                    <span className="nav-badge" aria-hidden="true">
                      {pendingCount}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/acceso" element={<AuthPage mode="login" />} />
      <Route path="/registro" element={<AuthPage mode="signup" />} />
      <Route path="/recuperar" element={<AuthPage mode="recovery" />} />
      <Route path="/nueva-contrasena" element={<UpdatePasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <TodayProvider>
              <ApplicationLayout />
            </TodayProvider>
          }
        >
          <Route path="/hoy" element={<TodayPage />} />
          <Route path="/historial" element={<HistoryPage />} />
          <Route path="/estadisticas" element={<StatisticsPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/hoy" replace />} />
    </Routes>
  )
}
