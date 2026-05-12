import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthProviders } from '@/components/shared/auth-providers';
import { LoginForm } from './login-form';

export const metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accedé a tu organización.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AuthProviders />
        <Divider label="o con email" />
        <LoginForm />
        <div className="flex flex-col gap-2 text-center text-sm text-[var(--color-text-secondary)]">
          <Link href="/magic-link" className="hover:text-[var(--color-text-primary)]">
            Usar un magic link
          </Link>
          <span>
            ¿No tenés cuenta?{' '}
            <Link href="/signup" className="text-[var(--color-accent-primary)] hover:underline">
              Registrate
            </Link>
          </span>
        </div>
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
