import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { DashboardPage } from '../pages/DashboardPage'

function ProtectedRoute() {
  return useAuth().session ? <Outlet /> : <Navigate to="/login" replace />
}
function GuestRoute() {
  return useAuth().session ? <Navigate to="/dashboard" replace /> : <Outlet />
}
export function AppRoutes() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = `${pathname === '/register' ? 'Create your workspace' : pathname === '/dashboard' ? 'Overview' : 'Sign in'} · SiteTrack`
    document.querySelector<HTMLElement>('h1')?.focus()
  }, [pathname])
  return <Routes>
    <Route element={<GuestRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}
