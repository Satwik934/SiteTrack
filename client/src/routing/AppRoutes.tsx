import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { DashboardPage } from '../pages/DashboardPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { CompanyPage } from '../pages/CompanyPage'

function ProtectedRoute() {
  return useAuth().session ? <Outlet /> : <Navigate to="/login" replace />
}
function GuestRoute() {
  return useAuth().session ? <Navigate to="/dashboard" replace /> : <Outlet />
}
function EmployeeAdminRoute() {
  const { session } = useAuth()
  return session && (session.user.role === 'owner' || session.user.role === 'manager')
    ? <Outlet /> : <Navigate to="/dashboard" replace />
}
export function AppRoutes() {
  const { pathname } = useLocation()
  useEffect(() => {
    const titles: Record<string, string> = { '/register': 'Create your workspace', '/dashboard': 'Overview', '/employees': 'Employees', '/company': 'Company' }
    document.title = `${titles[pathname] ?? 'Sign in'} · SiteTrack`
    document.querySelector<HTMLElement>('h1')?.focus()
  }, [pathname])
  return <Routes>
    <Route element={<GuestRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/company" element={<CompanyPage />} />
      <Route element={<EmployeeAdminRoute />}>
        <Route path="/employees" element={<EmployeesPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}
