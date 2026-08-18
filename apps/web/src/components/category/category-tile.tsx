import Link from 'next/link';
import * as Icons from 'lucide-react';
import type { Category } from '@a-la-mano/db';
import type { LucideIcon } from 'lucide-react';

function kebabToPascal(s: string): string {
  return s
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return Icons.Tag;
  const pascalName = kebabToPascal(name);
  const lib = Icons as unknown as Record<string, LucideIcon>;
  return lib[pascalName] ?? Icons.Tag;
}

export function CategoryTile({
  category,
  href,
}: {
  category: Category;
  href: string;
}) {
  const Icon = resolveIcon(category.iconName);
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm hover:border-[var(--color-accent-primary)]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-medium">{category.name}</span>
    </Link>
  );
}
