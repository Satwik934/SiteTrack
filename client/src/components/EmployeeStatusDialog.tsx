import { useEffect, useRef, useState } from 'react'
import type { Employee } from '../types/management'
import { managementErrorMessage } from '../services/management'

export function EmployeeStatusDialog({ employee, onConfirm, onClose }: {
  employee: Employee
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  async function confirm() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try { await onConfirm() }
    catch (error: unknown) { setError(managementErrorMessage(error)) }
    finally { busy.current = false; setPending(false) }
  }
  return <dialog ref={dialog} className="status-dialog" aria-labelledby="status-heading" onCancel={event => { event.preventDefault(); if (!pending) onClose() }}>
    <h2 id="status-heading">{employee.isActive ? 'Deactivate' : 'Reactivate'} employee?</h2>
    <p>{employee.firstName} {employee.lastName} {employee.isActive ? 'will lose access to SiteTrack. Their account will be kept and can be reactivated later.' : 'will be able to sign in again using their existing credentials.'}</p>
    {error && <div role="alert" className="form-error">{error}</div>}
    <div className="management-actions"><button className="button secondary" disabled={pending} onClick={onClose} autoFocus>Cancel</button>
      <button className={`button ${employee.isActive ? 'danger' : 'primary'}`} disabled={pending} onClick={confirm}>{pending ? 'Saving…' : employee.isActive ? 'Confirm deactivation' : 'Confirm reactivation'}</button></div>
  </dialog>
}
