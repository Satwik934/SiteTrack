import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FormField } from './FormField'
import { managementErrorMessage } from '../services/management'
import type { Employee, EmployeeChanges, NewEmployee } from '../types/management'

type Props = {
  employee?: Employee
  canAssignRole: boolean
  onCreate: (input: NewEmployee) => Promise<void>
  onUpdate: (changes: EmployeeChanges) => Promise<void>
  onCancel: () => void
}
export function EmployeeForm({ employee, canAssignRole, onCreate, onUpdate, onCancel }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const busy = useRef(false)
  useEffect(() => { formRef.current?.querySelector('input')?.focus() }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const data = new FormData(event.currentTarget)
    const firstName = String(data.get('firstName') ?? '').trim()
    const lastName = String(data.get('lastName') ?? '').trim()
    if (!firstName || !lastName) { setError('Enter a first and last name, not just spaces.'); return }
    const role = data.get('role') === 'manager' ? 'manager' : 'worker'
    const password = String(data.get('password') ?? '')
    if (!employee && (!password.trim() || password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError('Use a password of at least 8 characters and at most 72 bytes.'); return
    }
    busy.current = true
    setPending(true)
    setError('')
    try {
      if (employee) {
        await onUpdate({ firstName, lastName, ...(canAssignRole && role !== employee.role ? { role } : {}) })
      } else {
        await onCreate({ firstName, lastName, email: String(data.get('email') ?? '').trim().toLowerCase(), password, role })
      }
    } catch (error: unknown) { setError(managementErrorMessage(error, !employee)) }
    finally { busy.current = false; setPending(false) }
  }
  return <section className="employee-form-panel" aria-labelledby="employee-form-heading">
    <h2 id="employee-form-heading">{employee ? 'Edit employee' : 'Add employee'}</h2>
    <p>{employee ? 'Update profile details. Email and password cannot be changed here.' : 'Create an account for a member of your company.'}</p>
    <form ref={formRef} onSubmit={submit} aria-busy={pending}>
      {error && <div role="alert" className="form-error">{error}</div>}
      <fieldset disabled={pending}>
        <div className="form-row"><FormField label="First name" name="firstName" defaultValue={employee?.firstName} required autoComplete="off" />
          <FormField label="Last name" name="lastName" defaultValue={employee?.lastName} required autoComplete="off" /></div>
        {!employee && <><FormField label="Employee email" name="email" type="email" autoComplete="off" required />
          <FormField label="Initial password" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Share this initial password privately. Password reset is not available yet." /></>}
        {canAssignRole ? <div className="form-field"><label htmlFor="role">Role</label><select id="role" name="role" defaultValue={employee?.role ?? 'worker'}>
          <option value="worker">Worker</option><option value="manager">Manager</option>
        </select></div> : <p className="field-hint">Role: {employee?.role ?? 'worker'}{employee?.role === 'owner' ? ' — owner access is protected.' : ' — managers can manage worker profiles only.'}</p>}
        <div className="management-actions"><button className="button primary" type="submit">{pending ? 'Saving…' : employee ? 'Save changes' : 'Create employee'}</button>
          <button className="button secondary" type="button" onClick={onCancel}>Cancel</button></div>
      </fieldset>
    </form>
  </section>
}
