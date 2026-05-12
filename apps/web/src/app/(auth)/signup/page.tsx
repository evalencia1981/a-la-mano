import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthProviders } from '@/components/shared/auth-providers';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Crear cuenta' };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Empezá a usar la plataforma.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AuthProviders />
        <Divider label="o con email" />
        <SignupForm />
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-[var(--color-accent-primary)] hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] uppercase">
      <div className="h-px flex-1 bg-[var(--color-border)]" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}
