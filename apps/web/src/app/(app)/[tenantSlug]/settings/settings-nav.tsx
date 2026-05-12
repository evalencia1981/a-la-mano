'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { slug: '', label: 'General' },
  { slug: 'branding', label: 'Branding' },
  { slug: 'members', label: 'Miembros' },
  { slug: 'audit', label: 'Audit log' },
];

export function SettingsNav({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/settings`;

  return (
    <nav className="w-48 space-y-1">
      {links.map((l) => {
        const href = l.slug ? `${base}/${l.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={l.label}
            href={href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)]',
              active && 'bg-[var(--color-bg-secondary)] font-medium',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
