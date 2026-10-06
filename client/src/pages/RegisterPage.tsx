import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { AuthForm } from '../components/AuthForm'
import { FormField } from '../components/FormField'
import { register } from '../services/auth'

export function RegisterPage() {
  return <AuthLayout><section className="auth-card registration">
    <p className="eyebrow">START WITH A STRONG FOUNDATION</p><h1 tabIndex={-1}>Build your workspace.</h1>
    <p className="intro">Set up your company and your owner account.</p>
    <AuthForm registration submitLabel="Create workspace" pendingLabel="Creating workspace…" onSubmit={data => register({
      companyName: String(data.get('companyName')), companyEmail: String(data.get('companyEmail')),
      firstName: String(data.get('firstName')), lastName: String(data.get('lastName')),
      email: String(data.get('email')), password: String(data.get('password')),
    })}>
      <div className="form-section-label"><span>01</span> Company details</div>
      <FormField name="companyName" label="Company name" autoComplete="organization" placeholder="Your construction company" required />
      <FormField name="companyEmail" label="Company email" type="email" autoComplete="section-company email" placeholder="office@company.com" required />
      <div className="form-section-label"><span>02</span> Owner account</div>
      <div className="form-row"><FormField name="firstName" label="First name" autoComplete="given-name" required /><FormField name="lastName" label="Last name" autoComplete="family-name" required /></div>
      <FormField name="email" label="Your email address" type="email" autoComplete="username" placeholder="you@company.com" required />
      <FormField name="password" label="Password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters, up to 72 bytes." />
    </AuthForm>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in <span aria-hidden="true">↗</span></Link></p>
  </section></AuthLayout>
}
