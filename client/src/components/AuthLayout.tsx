import type { ReactNode } from 'react'
import { Brand } from './Brand'

export function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-layout">
    <aside className="auth-story" aria-label="About SiteTrack">
      <Brand />
      <div className="story-copy"><p className="eyebrow">BUILT FOR THE WORK AHEAD</p>
        <h2>A solid foundation.<br />For every build.</h2>
        <p>One workspace for the people, planning, and progress behind your construction business.</p>
      </div>
      <div className="blueprint" aria-hidden="true"><div className="plan plan-one" /><div className="plan plan-two" /><div className="plan plan-three" /><span className="plan-label">SITETRACK / FOUNDATION</span></div>
      <footer className="story-footer"><span className="tiny-cross" aria-hidden="true">+</span> From the office to the job site.</footer>
    </aside>
    <main className="auth-main" id="main-content"><div className="mobile-brand"><Brand /></div>{children}
      <p className="auth-footer">SiteTrack <span aria-hidden="true">/</span> Construction, connected.</p>
    </main>
  </div>
}
