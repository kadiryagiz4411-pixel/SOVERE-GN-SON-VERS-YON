/**
 * Compatibility barrel — SessionContext is the live auth source.
 * Components that still import AuthContext keep working without a second session race.
 */
export { SessionProvider as AuthProvider, useSession } from '@/contexts/SessionContext';
export { useAuth } from '@/hooks/useAuth';
