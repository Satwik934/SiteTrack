import { ApiError, apiRequest } from './api.ts'
import type { AuthSession, LoginInput, RegisterInput } from '../types/auth.ts'

function parseSession(value: unknown): AuthSession {
  if (typeof value !== 'object' || value === null || !('token' in value) || !('user' in value)) {
    throw new Error('Invalid authentication response.')
  }
  const { token, user } = value
  if (typeof token !== 'string' || !token || typeof user !== 'object' || user === null ||
    !('_id' in user) || typeof user._id !== 'string' ||
    !('company' in user) || typeof user.company !== 'string' ||
    !('firstName' in user) || typeof user.firstName !== 'string' ||
    !('lastName' in user) || typeof user.lastName !== 'string' ||
    !('email' in user) || typeof user.email !== 'string' ||
    !('isActive' in user) || user.isActive !== true ||
    !('role' in user) || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'worker')) {
    throw new Error('Invalid authentication response.')
  }
  // Retain safe fields explicitly, never arbitrary response properties.
  return { token, user: {
    _id: user._id, company: user.company, firstName: user.firstName,
    lastName: user.lastName, email: user.email, isActive: true, role: user.role,
  } }
}

export async function login(input: LoginInput): Promise<AuthSession> {
  return parseSession(await apiRequest('/auth/login', {
    method: 'POST', body: JSON.stringify({ email: input.email.trim().toLowerCase(), password: input.password }),
  }))
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  return parseSession(await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({
    companyName: input.companyName.trim(), companyEmail: input.companyEmail.trim().toLowerCase(),
    firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(), password: input.password,
  }) }))
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Email or password is incorrect, or the account is unavailable.'
    if (error.status === 409) return 'An account with this email already exists. Try signing in.'
    if (error.status === 400) return 'Please check your details and try again.'
    if (error.status === 429) return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'We couldn’t connect to your workspace. Please try again in a moment.'
}
