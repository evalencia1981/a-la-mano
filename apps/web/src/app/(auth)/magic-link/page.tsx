import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MagicLinkForm } from '@/components/shared/magic-link-form';

export const metadata = { title: 'Magic link' };

export default function MagicLinkPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar con magic link</CardTitle>
        <CardDescription>
          Te mandamos un link a tu email para que entres sin contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <MagicLinkForm />
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          <Link href="/login" className="hover:text-[var(--color-text-primary)]">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
