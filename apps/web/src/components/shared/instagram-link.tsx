import { Instagram } from 'lucide-react';

export function InstagramLink({ url, handle }: { url: string | null; handle: string | null }) {
  if (!url || !handle) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
    >
      <Instagram className="h-4 w-4" />
      @{handle.replace(/^@/, '')}
    </a>
  );
}
