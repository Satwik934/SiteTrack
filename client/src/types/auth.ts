export interface AuthUser {
  _id: string
  company: string
  firstName: string
  lastName: string
  email: string
  role: 'owner' | 'manager' | 'worker'
  isActive: boolean
}
export interface AuthSession { token: string; user: AuthUser }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput {
  companyName: string
  companyEmail: string
  firstName: string
  lastName: string
}
