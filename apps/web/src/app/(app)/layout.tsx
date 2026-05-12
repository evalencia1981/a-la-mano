import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * Gate de autenticación. Cualquier ruta dentro de `(app)/` requiere un
 * user logueado — si no hay, redirect a /login.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <>{children}</>;
}
