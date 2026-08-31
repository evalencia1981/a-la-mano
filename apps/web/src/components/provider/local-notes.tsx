'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateLocalNotesAction } from '@/server/actions/community-provider.actions';

export function LocalNotes({
  tenantId,
  communityProviderId,
  notes,
  canEdit,
}: {
  tenantId: string;
  communityProviderId: string;
  notes: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? '');
  const [isPending, startTransition] = useTransition();

  function save() {
    const formData = new FormData();
    formData.set('localNotes', value);
    startTransition(async () => {
      const result = await updateLocalNotesAction(tenantId, communityProviderId, formData);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  if (!canEdit && !notes) return null;

  return (
    <div className="rounded-[var(--radio-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">
          Notas internas (solo admins)
        </span>
        {canEdit && !editing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className="w-full campo px-3 py-2 text-base sm:text-sm"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save} disabled={isPending}>
              <Save className="h-3 w-3" />
              Guardar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-line">{notes ?? <span className="italic text-[var(--color-text-secondary)]">Sin notas todavía.</span>}</p>
      )}
    </div>
  );
}
