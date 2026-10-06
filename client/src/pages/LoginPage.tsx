import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { AuthForm } from '../components/AuthForm'
import { FormField } from '../components/FormField'
import { login } from '../services/auth'

export function LoginPage() {
  return <AuthLayout><section className="auth-card">
    <p className="eyebrow">YOUR WORKSPACE AWAITS</p><h1 tabIndex={-1}>Welcome back.</h1>
    <p className="intro">Sign in to your SiteTrack workspace.</p>
    <AuthForm submitLabel="Sign in" pendingLabel="Signing in…" onSubmit={data => login({ email: String(data.get('email')), password: String(data.get('password')) })}>
      <FormField name="email" label="Email address" type="email" autoComplete="username" placeholder="you@company.com" required />
      <FormField name="password" label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
    </AuthForm>
    <p className="auth-switch">New to SiteTrack? <Link to="/register">Create a workspace <span aria-hidden="true">↗</span></Link></p>
    <div className="form-note"><span aria-hidden="true">↳</span> Your company. Your team. One place to start.</div>
  </section></AuthLayout>
}
