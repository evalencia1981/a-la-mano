import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WhatsappButton({
  url,
  label = 'WhatsApp',
  className,
}: {
  url: string | null;
  label?: string;
  className?: string;
}) {
  if (!url) return null;
  return (
    <Button asChild className={cn('bg-[#25D366] hover:bg-[#1ebe5b] text-white', className)}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
