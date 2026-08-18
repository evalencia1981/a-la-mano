import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { IngresarConGoogle } from './ingresar-con-google';
import { getCurrentUser } from '@/lib/auth/current-user';
import { memberService } from '@/server/services/member.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';

export const metadata = { title: 'Unirse a una comunidad' };

interface Props {
  params: Promise<{ codigo: string }>;
}

/**
 * Ingreso a una comunidad por su enlace.
 *
 * El administrador comparte este enlace en el grupo del edificio. Quien
 * llega inicia sesión con Google y queda adentro — sin identidad no podría
 * calificar, que es la mitad del producto.
 *
 * El código se valida antes de pedir la sesión: si el enlace está mal,
 * conviene decirlo ahí mismo y no después de hacer iniciar sesión al vecino.
 */
export default async function UnirsePage({ params }: Props) {
  const { codigo } = await params;
  const tenant = await tenantRepository.findByJoinCode(codigo);
  if (!tenant) notFound();

  const user = await getCurrentUser();

  if (user) {
    const { tenant: comunidad } = await memberService.joinByCode(codigo, user.id);
    redirect(`/${comunidad.slug}`);
  }

  const ingresoCerrado = !tenant.joinCodeEnabled;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: tenant.primaryColor ?? 'var(--color-accent-primary)' }}
        >
          <Users className="h-7 w-7 text-white" />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-secondary)]">Te invitaron a</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-[15px] text-[var(--color-text-secondary)]">
            El directorio de servicios de confianza de tu comunidad: los proveedores que tus
            vecinos ya probaron y calificaron.
          </p>
        </div>

        {ingresoCerrado ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-8">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {tenant.name} cerró el ingreso por enlace. Pedile acceso a la administración.
            </p>
          </div>
        ) : (
          <>
            <IngresarConGoogle codigo={codigo} />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Entrás con tu cuenta de Google. Tu nombre queda visible para tus vecinos cuando
              califiques a un proveedor.
            </p>
          </>
        )}

        <p className="text-sm text-[var(--color-text-secondary)]">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="underline underline-offset-4 hover:text-[var(--color-text-primary)]">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
