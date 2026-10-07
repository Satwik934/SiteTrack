import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Brand } from './Brand'
import { ApiStatus } from './ApiStatus'

export function AppLayout({ children, title = 'Overview' }: { children: ReactNode; title?: string }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  if (!session) return null
  const { user } = session
  return <div className="app-layout"><a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar"><Brand /><div className="workspace-label">COMPANY WORKSPACE</div>
      <nav aria-label="Main navigation"><NavLink to="/dashboard"><span aria-hidden="true">▦</span> Overview</NavLink>
        <NavLink to="/company"><span aria-hidden="true">⌂</span> Company</NavLink>
        {user.role !== 'worker' && <NavLink to="/employees"><span aria-hidden="true">☷</span> Employees</NavLink>}
      </nav>
      <div className="sidebar-note">A foundation for<br />what you build next.</div>
      <div className="account"><span className="avatar" aria-hidden="true">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</span><div><strong>{user.firstName} {user.lastName}</strong><span className="role">{user.role}</span></div></div>
      <button className="logout" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Sign out <span aria-hidden="true">↗</span></button>
    </aside>
    <div className="workspace"><header className="workspace-header"><span>Workspace <span aria-hidden="true">/</span> <strong>{title}</strong></span><ApiStatus /></header>
      <main id="main-content" className="dashboard-main">{children}</main><footer className="workspace-footer">SiteTrack / Built for the work ahead.</footer>
    </div>
  </div>
}
