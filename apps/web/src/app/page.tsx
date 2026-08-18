import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Landing pública de A la Mano. Mínimo viable — sin tracking, sin pricing,
 * sin marketing fancy. Cuando arranque el go-to-market, reemplazar por un
 * marketing site real (probablemente en otro dominio).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">A la Mano</h1>
        <p className="text-lg text-[var(--color-text-secondary)]">
          El directorio privado de servicios de tu comunidad. Plomeros, electricistas,
          jardineros — todos los que tu unidad o congregación ya conoce, en un solo lugar
          y calificados por gente que sí vive ahí.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/signup">Empezar gratis</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          30 días de trial gratis al crear tu comunidad.
        </p>
      </div>
    </main>
  );
}
