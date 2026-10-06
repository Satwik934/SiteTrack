import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { authErrorMessage } from '../services/auth'
import type { AuthSession } from '../types/auth'

interface Props {
  children: ReactNode
  submitLabel: string
  pendingLabel: string
  registration?: boolean
  onSubmit: (data: FormData) => Promise<AuthSession>
}
export function AuthForm({ children, submitLabel, pendingLabel, registration = false, onSubmit }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    let validationError = ''
    data.forEach((value, key) => {
      if (typeof value !== 'string' || !value.trim()) validationError = 'Please complete all fields. Blank spaces aren’t valid entries.'
      if (registration && key === 'password' && typeof value === 'string' && new TextEncoder().encode(value).length > 72) {
        validationError = 'Please use a password of at most 72 bytes; some characters use more than one byte.'
      }
    })
    if (validationError) { setError(validationError); return }
    busy.current = true
    setPending(true)
    setError('')
    try {
      const session = await onSubmit(data)
      form.reset()
      signIn(session)
      navigate('/dashboard', { replace: true })
    } catch (error: unknown) {
      setError(authErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return <form onSubmit={submit} aria-busy={pending}>
    {error && <div className="form-error" role="alert">{error}</div>}
    <fieldset disabled={pending}>{children}<button className="button primary" type="submit">
      {pending ? pendingLabel : submitLabel}<span aria-hidden="true">→</span>
    </button></fieldset>
    <span className="sr-only" role="status">{pending ? pendingLabel : ''}</span>
  </form>
}
