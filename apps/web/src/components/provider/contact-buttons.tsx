import { Phone } from 'lucide-react';
import { WhatsappButton } from '@/components/shared/whatsapp-button';
import { InstagramLink } from '@/components/shared/instagram-link';
import { armarMensajeContacto, getInstagramUrl, getTelUrl, getWhatsappUrl } from '@/lib/contact';
import type { DatosDeContacto } from './provider-card';
import type { Provider } from '@a-la-mano/db';

/**
 * Botones de contacto de la ficha del proveedor.
 *
 * El chat de WhatsApp arranca presentado: quién escribe, de qué comunidad y
 * que salió del directorio. Ver `armarMensajeContacto`.
 */
export function ContactButtons({
  provider,
  contacto,
}: {
  provider: Provider;
  contacto?: DatosDeContacto;
}) {
  const whatsappUrl = getWhatsappUrl(
    provider,
    contacto ? armarMensajeContacto({ ...contacto, proveedor: provider.name }) : null,
  );
  const instagramUrl = getInstagramUrl(provider.instagramHandle);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <WhatsappButton url={whatsappUrl} />
      <a
        href={getTelUrl(provider.phone)}
        data-tactil
        className="flex items-center gap-2 rounded-[var(--radio-control)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] foco"
      >
        <Phone className="h-4 w-4" />
        Llamar
      </a>
      <InstagramLink url={instagramUrl} handle={provider.instagramHandle} />
    </div>
  );
}
