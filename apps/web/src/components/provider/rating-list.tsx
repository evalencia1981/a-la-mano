'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RatingStars } from './rating-stars';
import { hideRatingAction, unhideRatingAction } from '@/server/actions/rating.actions';
import type { RatingWithAuthor } from '@/server/repositories/rating.repository';
import type { Role } from '@/types/role';

export function RatingList({
  tenantId,
  ratings,
  actorRole,
}: {
  tenantId: string;
  ratings: RatingWithAuthor[];
  actorRole: Role;
}) {
  const router = useRouter();
  const [showActive, setShowActive] = useState(true);
  const [isPending, startTransition] = useTransition();
  const canManage = actorRole === 'owner' || actorRole === 'admin';

  const visible = showActive
    ? ratings.filter((r) => r.memberStatus !== 'inactive')
    : ratings;

  function toggleHide(ratingId: string, currentlyHidden: boolean) {
    startTransition(async () => {
      const result = currentlyHidden
        ? await unhideRatingAction(tenantId, ratingId)
        : await hideRatingAction(tenantId, ratingId, null);
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Calificaciones ({ratings.length})</h3>
        <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={showActive}
            onChange={(e) => setShowActive(e.target.checked)}
          />
          Ver solo miembros actuales
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Sin calificaciones todavía.</p>
      ) : (
        <ul className="space-y-4 divide-y divide-[var(--color-border)]">
          {visible.map(({ rating, authorName, authorEmail, memberStatus }) => (
            <li key={rating.id} className="pt-4 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{authorName ?? authorEmail}</span>
                    {memberStatus === 'inactive' && (
                      <span className="rounded bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]">
                        Ex-miembro
                      </span>
                    )}
                    {rating.isHidden && (
                      <span className="rounded bg-[var(--color-error)] px-1.5 py-0.5 text-xs text-white">
                        Oculto
                      </span>
                    )}
                  </div>
                  <RatingStars value={rating.stars} size={14} />
                  {rating.comment && (
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-line pt-1">
                      {rating.comment}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-secondary)] pt-1">
                    {new Date(rating.createdAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => toggleHide(rating.id, rating.isHidden)}
                  >
                    {rating.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
