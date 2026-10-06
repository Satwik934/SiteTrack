import { useAuth } from '../auth/useAuth'
import { AppLayout } from '../components/AppLayout'

export function DashboardPage() {
  const { session } = useAuth()
  if (!session) return null
  return <AppLayout><p className="eyebrow">WORKSPACE OVERVIEW</p>
    <h1 tabIndex={-1}>Welcome, {session.user.firstName}.</h1><p className="intro">Your next chapter starts with a solid foundation.</p>
    <section className="welcome-panel"><div><span className="status-tag">FOUNDATION IN PLACE</span><h2>You’re in. Let’s build from here.</h2>
      <p>Your account is connected to your company workspace. This is the starting point for SiteTrack’s construction tools.</p></div><div className="building-mark" aria-hidden="true"><span /><span /><span /></div></section>
    <div className="section-heading"><h2>Your workspace, taking shape</h2><span>What’s ahead</span></div>
    <div className="roadmap-grid">{[
      ['01', 'Plan the work', 'A future home for estimates, bids, and project planning.'],
      ['02', 'Connect the field', 'A future home for your team and daily job-site updates.'],
      ['03', 'Understand the costs', 'A future home for materials, expenses, and cost tracking.'],
    ].map(([number, title, description]) => <section className="roadmap-card" key={number}><span className="card-number">{number}</span><h3>{title}</h3><p>{description}</p><span className="coming-soon">Planned · Not yet available</span></section>)}</div>
    <p className="dashboard-note">This workspace is a foundation. Business tools and project data will appear as features become available.</p>
  </AppLayout>
}
