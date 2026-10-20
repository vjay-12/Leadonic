import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

/**
 * Fetches server configuration once after login with a long stale time.
 */
export function useAppConfig() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.getConfig(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60, // 1 hour (long stale time)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Returns true if permanent delete is enabled by the server environment.
 * Defaults safely to false while loading or when disabled.
 */
export function useDeleteEnabled(): boolean {
  const { data } = useAppConfig()
  return data?.deleteEnabled === true
}
