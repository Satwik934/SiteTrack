import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { AppLayout } from '../components/AppLayout'
import { EmployeeForm } from '../components/EmployeeForm'
import { EmployeeStatusDialog } from '../components/EmployeeStatusDialog'
import { ApiError } from '../services/api'
import { createEmployee, listEmployees, managementErrorMessage, updateEmployee } from '../services/management'
import type { Employee, EmployeeChanges, NewEmployee } from '../types/management'
import './Management.css'

export function EmployeesPage() {
  const { session, signIn, logout } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)
  const [changingStatus, setChangingStatus] = useState<Employee | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  function reload() { setLoading(true); setError(''); setRefresh(value => value + 1) }
  const token = session?.token

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    listEmployees(token, controller.signal).then(setEmployees).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(managementErrorMessage(error))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, refresh])
  if (!session) return null
  const owner = session.user.role === 'owner'
  const filtered = employees.filter(employee => `${employee.firstName} ${employee.lastName} ${employee.email}`.toLowerCase().includes(search.toLowerCase()))
  function closeEditor() { setEditing(null); setChangingStatus(null); requestAnimationFrame(() => trigger.current?.focus()) }
  function saved(employee: Employee, created = false) {
    setEmployees(current => created ? [...current, employee] : current.map(item => item._id === employee._id ? employee : item))
    if (session && session.user._id === employee._id) {
      signIn({ ...session, user: { ...session.user, firstName: employee.firstName, lastName: employee.lastName } })
    }
    closeEditor()
    setSuccess(created ? 'Employee added successfully.' : 'Employee updated successfully.')
  }
  async function create(input: NewEmployee) {
    try { saved(await createEmployee(session!.token, input), true) }
    catch (error: unknown) { if (error instanceof ApiError && error.status === 401) logout(); throw error }
  }
  async function update(employee: Employee, changes: EmployeeChanges) {
    try { saved(await updateEmployee(session!.token, employee._id, changes)) }
    catch (error: unknown) { if (error instanceof ApiError && error.status === 401) logout(); throw error }
  }
  const sorted = [...filtered].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
  return <AppLayout title="Employees"><div className="management-heading"><div><p className="eyebrow">YOUR COMPANY · YOUR PEOPLE</p>
    <h1 tabIndex={-1}>Employees</h1><p className="intro">Manage the people and access behind your work.</p></div>
    <button className="button primary" disabled={loading || Boolean(error) || editing !== null || changingStatus !== null} onClick={event => { trigger.current = event.currentTarget; setSuccess(''); setEditing('new') }}>+ Add employee</button></div>
    {success && <p className="success-notice" role="status">{success}</p>}
    {editing && <EmployeeForm key={editing === 'new' ? 'new' : editing._id} employee={editing === 'new' ? undefined : editing}
      canAssignRole={owner && (editing === 'new' || editing.role !== 'owner')} onCreate={create}
      onUpdate={changes => editing !== 'new' ? update(editing, changes) : Promise.resolve()} onCancel={closeEditor} />}
    <section className="employee-list" aria-label="Company employees"><div className="list-toolbar"><div><h2>Company directory</h2><p>{owner ? 'Owners can manage manager and worker accounts.' : 'Managers can create and manage worker accounts.'}</p></div>
      <div className="form-field"><label htmlFor="employee-search">Find an employee</label><input id="employee-search" type="search" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <button className="button secondary refresh-button" disabled={loading || editing !== null || changingStatus !== null} onClick={reload}>Refresh list</button>
    </div>
    {loading ? <p className="empty-state" role="status">Loading employees…</p> : error ? <div className="empty-state"><p role="alert">{error}</p><button className="button secondary" onClick={reload}>Retry</button></div> : !sorted.length ?
      <p className="empty-state">{search ? 'No employees match your search.' : 'No employees yet. Add your first team member to get started.'}</p> :
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Employee directory; scroll horizontally to see all columns"><table><caption className="sr-only">Employees in your company</caption><thead><tr><th scope="col">Employee</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
        <tbody>{sorted.map(employee => {
          const canEdit = owner || employee.role === 'worker'
          const canChangeStatus = canEdit && employee.role !== 'owner'
          return <tr key={employee._id}><td><strong>{employee.firstName} {employee.lastName}{employee._id === session.user._id && <span className="self-label">You</span>}</strong><span className="employee-email">{employee.email}</span></td>
            <td><span className="employee-role">{employee.role}</span></td><td><span className={`status-badge ${employee.isActive ? 'active' : 'inactive'}`}>{employee.isActive ? 'Active' : 'Inactive'}</span></td>
            <td><div className="row-actions">{canEdit && <button disabled={editing !== null || changingStatus !== null} onClick={event => { trigger.current = event.currentTarget; setSuccess(''); setEditing(employee) }} aria-label={`Edit ${employee.firstName} ${employee.lastName}`}>Edit</button>}
              {canChangeStatus && <button disabled={editing !== null || changingStatus !== null} onClick={event => { trigger.current = event.currentTarget; setSuccess(''); setChangingStatus(employee) }} aria-label={`${employee.isActive ? 'Deactivate' : 'Reactivate'} ${employee.firstName} ${employee.lastName}`}>{employee.isActive ? 'Deactivate' : 'Reactivate'}</button>}
              {employee.role === 'owner' && <span className="protected-label">Owner access protected</span>}
              {!canEdit && employee.role !== 'owner' && <span className="protected-label">View only</span>}</div></td></tr>
        })}</tbody></table></div>}
    </section>
    {changingStatus && <EmployeeStatusDialog employee={changingStatus} onClose={closeEditor} onConfirm={() => update(changingStatus, { isActive: !changingStatus.isActive })} />}
  </AppLayout>
}
