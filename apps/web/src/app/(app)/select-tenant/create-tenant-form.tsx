'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTenantAction } from '@/server/actions/tenant.actions';
import { slugify } from '@/lib/utils';

export function CreateTenantForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTenantAction(formData);
      if (result.ok) {
        router.push(`/${result.data.tenant.slug}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la comunidad</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          minLength={2}
          placeholder="Conjunto Los Cedros / Iglesia Central / ..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugTouched(true);
          }}
          required
          minLength={2}
          pattern="[a-z0-9-]+"
          placeholder="los-cedros"
        />
        <p className="text-xs text-[var(--color-text-secondary)]">
          Solo minúsculas, números y guiones. Va a ser parte de la URL.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de comunidad</Label>
        <select
          id="type"
          name="type"
          defaultValue="residential"
          className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
        >
          <option value="residential">Unidad residencial</option>
          <option value="religious">Congregación religiosa</option>
          <option value="group">Otro grupo</option>
        </select>
      </div>
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creando...' : 'Crear comunidad'}
      </Button>
    </form>
  );
}
