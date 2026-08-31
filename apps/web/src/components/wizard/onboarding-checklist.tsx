import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import type { Tenant } from '@a-la-mano/db';

interface ChecklistState {
  brandingDone: boolean;
  hasFirstProvider: boolean;
  hasInvited: boolean;
}

export function OnboardingChecklist({
  tenant,
  state,
}: {
  tenant: Tenant;
  state: ChecklistState;
}) {
  const items = [
    {
      done: Boolean(tenant.logoUrl),
      label: 'Subir logo y elegir colores',
      href: `/${tenant.slug}/settings/branding`,
    },
    {
      done: state.hasFirstProvider,
      label: 'Agregar primer proveedor',
      href: `/${tenant.slug}/admin/providers/new`,
    },
    {
      done: state.hasInvited,
      label: 'Invitar primeros miembros',
      href: `/${tenant.slug}/settings/members`,
    },
  ];

  const remaining = items.filter((i) => !i.done).length;
  if (remaining === 0) return null;

  return (
    <div className="superficie p-4 text-sm">
      <div className="mb-3 font-semibold">Empezar — {remaining} {remaining === 1 ? 'paso' : 'pasos'} pendientes</div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              href={i.href}
              className={`flex items-center gap-2 ${i.done ? 'text-[var(--color-text-secondary)] line-through' : 'hover:text-[var(--color-accent-primary)]'}`}
            >
              {i.done ? (
                <Check className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <Circle className="h-4 w-4 text-[var(--color-text-secondary)]" />
              )}
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
