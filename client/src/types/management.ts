import type { AuthUser } from './auth'

export type Employee = Pick<AuthUser, '_id' | 'firstName' | 'lastName' | 'email' | 'role' | 'isActive'> & {
  createdAt?: string
  updatedAt?: string
}
export interface NewEmployee {
  firstName: string
  lastName: string
  email: string
  password: string
  role: 'manager' | 'worker'
}
export interface EmployeeChanges {
  firstName?: string
  lastName?: string
  role?: 'manager' | 'worker'
  isActive?: boolean
}
export interface CompanyInfo {
  _id: string
  name: string
  email: string
  phone?: string
  address?: { street?: string; city?: string; province?: string; postalCode?: string }
}
