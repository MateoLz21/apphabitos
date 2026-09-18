import { CalendarDays, ChartNoAxesCombined, CircleCheckBig, LogOut, Settings } from 'lucide-react'
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { PlaceholderPage } from './components/PlaceholderPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { TodayPage } from './pages/TodayPage'

const navigation = [
  { to: '/hoy', label: 'Hoy', icon: CircleCheckBig }, { to: '/historial', label: 'Historial', icon: CalendarDays },
  { to: '/estadisticas', label: 'Estadísticas', icon: ChartNoAxesCombined }, { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

function ApplicationLayout() {
  const { signOut } = useAuth()
  return <div className="app-shell">
    <header className="topbar"><NavLink to="/hoy" className="brand" aria-label="Rutina, ir al inicio"><span className="brand-mark">R</span><span>Rutina</span></NavLink><button type="button" className="sign-out" onClick={() => void signOut()}><LogOut size={18} aria-hidden="true" /><span>Salir</span></button></header>
    <main className="page-content"><Outlet /></main>
    <nav className="bottom-nav" aria-label="Navegación principal">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon aria-hidden="true" size={21} /><span>{label}</span></NavLink>)}</nav>
  </div>
}

export default function App() {
  return <Routes>
    <Route path="/acceso" element={<AuthPage mode="login" />} /><Route path="/registro" element={<AuthPage mode="signup" />} /><Route path="/recuperar" element={<AuthPage mode="recovery" />} />
    <Route element={<ProtectedRoute />}><Route element={<ApplicationLayout />}><Route path="/hoy" element={<TodayPage />} /><Route path="/historial" element={<PlaceholderPage title="Historial" description="Aquí verás tu calendario de cumplimiento." />} /><Route path="/estadisticas" element={<PlaceholderPage title="Estadísticas" description="Aquí podrás revisar tus rachas y progreso." />} /><Route path="/ajustes" element={<PlaceholderPage title="Ajustes" description="Aquí configurarás tu perfil y recordatorios." />} /></Route></Route>
    <Route path="*" element={<Navigate to="/hoy" replace />} />
  </Routes>
}
