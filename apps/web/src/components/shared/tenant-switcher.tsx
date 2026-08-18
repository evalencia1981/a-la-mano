'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Plus, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Tenant } from '@a-la-mano/db';

interface Props {
  current: Tenant;
  options: Array<{ tenant: Tenant; role: string }>;
}

export function TenantSwitcher({ current, options }: Props) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="truncate max-w-[140px] text-left">{current.name}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuLabel>Tus organizaciones</DropdownMenuLabel>
        {options.map(({ tenant, role }) => (
          <DropdownMenuItem
            key={tenant.id}
            onSelect={() => router.push(`/${tenant.slug}`)}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex flex-col">
              <span className="text-sm">{tenant.name}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{role}</span>
            </div>
            {tenant.id === current.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/select-tenant?create=true" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Crear nueva organización
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
