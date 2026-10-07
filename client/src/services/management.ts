import { apiRequest, ApiError } from './api'
import type { CompanyInfo, Employee, EmployeeChanges, NewEmployee } from '../types/management'

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function parseEmployee(value: unknown): Employee {
  if (!object(value) || typeof value._id !== 'string' || typeof value.firstName !== 'string' ||
    typeof value.lastName !== 'string' || typeof value.email !== 'string' || typeof value.isActive !== 'boolean' ||
    (value.role !== 'owner' && value.role !== 'manager' && value.role !== 'worker')) {
    throw new Error('Invalid employee response.')
  }
  return { _id: value._id, firstName: value.firstName, lastName: value.lastName, email: value.email,
    role: value.role, isActive: value.isActive,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  }
}
export async function listEmployees(token: string, signal?: AbortSignal): Promise<Employee[]> {
  const data = await apiRequest('/employees', { signal }, token)
  if (!object(data) || !Array.isArray(data.employees)) throw new Error('Invalid employee response.')
  return data.employees.map(parseEmployee)
}
export async function createEmployee(token: string, input: NewEmployee): Promise<Employee> {
  const data = await apiRequest('/employees', { method: 'POST', body: JSON.stringify(input) }, token)
  if (!object(data)) throw new Error('Invalid employee response.')
  return parseEmployee(data.employee)
}
export async function updateEmployee(token: string, id: string, changes: EmployeeChanges): Promise<Employee> {
  const data = await apiRequest(`/employees/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) }, token)
  if (!object(data)) throw new Error('Invalid employee response.')
  return parseEmployee(data.employee)
}
export async function getCompany(token: string, signal?: AbortSignal): Promise<CompanyInfo> {
  const data = await apiRequest('/company', { signal }, token)
  const company = object(data) ? data.company : undefined
  if (!object(company) || typeof company._id !== 'string' || typeof company.name !== 'string' || typeof company.email !== 'string') {
    throw new Error('Invalid company response.')
  }
  const address = object(company.address) ? company.address : {}
  return { _id: company._id, name: company.name, email: company.email,
    phone: typeof company.phone === 'string' ? company.phone : undefined,
    address: Object.fromEntries(['street', 'city', 'province', 'postalCode'].filter(key => typeof address[key] === 'string').map(key => [key, address[key]])),
  }
}
export function managementErrorMessage(error: unknown, creating = false): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session is no longer valid. Please sign in again.'
    if (error.status === 403) return 'You don’t have permission to make this change.'
    if (error.status === 404) return 'This record is unavailable in your company. Refresh and try again.'
    if (error.status === 409) return creating ? 'An account with this email already exists.' : 'This employee has changed. Refresh the list and try again.'
    if (error.status === 400) return 'Please check the details and try again.'
  }
  return 'Unable to complete the request. Please check your connection and try again.'
}
