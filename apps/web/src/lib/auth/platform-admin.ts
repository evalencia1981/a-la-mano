import 'server-only';
import { getCurrentUser } from './current-user';

/**
 * Devuelve el user actual si tiene `is_platform_admin = true`, sino null.
 * Los layouts del área `(platform-admin)` lo usan para gate-keep.
 */
export async function getPlatformAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.profile?.isPlatformAdmin) return null;
  return user;
}
