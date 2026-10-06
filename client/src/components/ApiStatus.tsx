import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'

export function ApiStatus() {
  const [status, setStatus] = useState('Checking connection…')
  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/health', { signal: controller.signal }).then(data => {
      setStatus(typeof data === 'object' && data !== null && 'status' in data && data.status === 'ok' ? 'API connected' : 'API unavailable')
    }).catch(() => { if (!controller.signal.aborted) setStatus('API unavailable') })
    return () => controller.abort()
  }, [])
  return <span className="api-status" role="status">{status}</span>
}
