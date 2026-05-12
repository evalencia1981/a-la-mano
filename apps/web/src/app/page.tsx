import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Landing minimal del template. Reemplazar en cada proyecto con el
 * marketing site real, o redirigir directo a `/login` si no se necesita.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">evalencia-stack</h1>
        <p className="text-lg text-[var(--color-text-secondary)]">
          Starter para SaaS multi-tenant en TypeScript. Auth, tenancy, branding y audit
          listos desde día uno — vos arrancás con el primer feature de negocio.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Crear cuenta</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
