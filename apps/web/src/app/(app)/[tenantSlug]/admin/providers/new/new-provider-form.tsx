'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addProviderToCommunityAction } from '@/server/actions/community-provider.actions';
import type { Category } from '@a-la-mano/db';

export function NewProviderForm({
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
  const [info, setInfo] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await addProviderToCommunityAction(tenantId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.data.wasCreated) {
        setInfo('Este teléfono ya estaba en la base — lo asociamos al provider existente.');
      }
      router.push(`/${tenantSlug}/directory/provider/${result.data.communityProvider.id}`);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            className="h-11 w-full campo px-3.5 text-base sm:text-sm"
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

      <div className="space-y-2">
        <Label htmlFor="whatsappNumber">WhatsApp alternativo (opcional)</Label>
        <Input id="whatsappNumber" name="whatsappNumber" type="tel" />
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
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          name="description"
          maxLength={1000}
          rows={3}
          className="w-full campo px-3.5 py-2.5 text-base sm:text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="localNotes">Notas internas (solo admins de tu comunidad)</Label>
        <textarea
          id="localNotes"
          name="localNotes"
          maxLength={2000}
          rows={2}
          className="w-full campo px-3.5 py-2.5 text-base sm:text-sm"
        />
      </div>

      {info && <p className="text-sm text-[var(--color-success)]">{info}</p>}
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Agregando...' : 'Agregar proveedor'}
      </Button>
    </form>
  );
}
