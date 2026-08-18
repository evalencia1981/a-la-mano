'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSuggestionAction } from '@/server/actions/suggestion.actions';
import type { Category } from '@a-la-mano/db';

export function SuggestionForm({
  tenantId,
  tenantSlug,
  categories,
}: {
  tenantId: string;
  tenantSlug: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSuggestionAction(tenantId, formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.push(`/${tenantSlug}/my-suggestions`);
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del proveedor</Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm"
          >
            <option value="">Elegí una</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" required minLength={7} />
        </div>
        <div className="space-y-2 flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isWhatsapp" defaultChecked />
            ¿Es WhatsApp?
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" name="city" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Barrio</Label>
          <Input id="neighborhood" name="neighborhood" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramHandle">Instagram (opcional)</Label>
        <Input id="instagramHandle" name="instagramHandle" placeholder="@usuario" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Qué hace / cómo lo describirías</Label>
        <textarea
          id="description"
          name="description"
          maxLength={1000}
          rows={3}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="memberNote">Nota para los admins (opcional)</Label>
        <textarea
          id="memberNote"
          name="memberNote"
          maxLength={500}
          rows={2}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm"
          placeholder="Por qué lo recomendás, contexto..."
        />
      </div>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Enviar sugerencia'}
      </Button>
    </form>
  );
}
