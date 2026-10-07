import { useEffect, useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../auth/useAuth'
import { getCompany, managementErrorMessage } from '../services/management'
import type { CompanyInfo } from '../types/management'
import './Management.css'

export function CompanyPage() {
  const { session } = useAuth()
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  function reload() { setLoading(true); setError(''); setRefresh(value => value + 1) }
  const token = session?.token
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getCompany(token, controller.signal).then(setCompany).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(managementErrorMessage(error))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, refresh])
  return <AppLayout title="Company"><p className="eyebrow">COMPANY WORKSPACE</p><h1 tabIndex={-1}>Company information</h1>
    <p className="intro">The business your SiteTrack account belongs to.</p>
    {loading ? <p role="status">Loading company…</p> : error ? <div className="empty-state"><p role="alert">{error}</p><button className="button secondary" onClick={reload}>Retry</button></div> : company &&
      <section className="company-card"><span className="status-tag">YOUR COMPANY</span><h2>{company.name}</h2><dl>
        <div><dt>Email</dt><dd>{company.email}</dd></div><div><dt>Phone</dt><dd>{company.phone || 'Not provided'}</dd></div>
        <div><dt>Address</dt><dd>{[company.address?.street, company.address?.city, company.address?.province, company.address?.postalCode].filter(Boolean).join(', ') || 'Not provided'}</dd></div>
      </dl><p className="field-hint">Company information is currently view-only.</p></section>}
  </AppLayout>
}
