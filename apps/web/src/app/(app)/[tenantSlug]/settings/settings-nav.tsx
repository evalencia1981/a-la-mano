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
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:w-48 lg:flex-col lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
      {links.map((l) => {
        const href = l.slug ? `${base}/${l.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={l.label}
            href={href}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)] lg:block',
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
