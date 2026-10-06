export class ApiError extends Error {
  status: number
  constructor(status: number) {
    super('The request could not be completed.')
    this.status = status
  }
}

export async function apiRequest(path: string, options: RequestInit = {}, token?: string): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`/api${path}`, { ...options, headers })
  if (!response.ok) throw new ApiError(response.status)
  return response.json()
}
