import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { communityProviderService } from '@/server/services/community-provider.service';
import { providerPhotoService } from '@/server/services/provider-photo.service';
import { PhotoManager } from './photo-manager';
import { LocalNotes } from '@/components/provider/local-notes';
import { ProviderActions } from './provider-actions';
import { FichaForm } from './ficha-form';

export const metadata = { title: 'Editar proveedor' };

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function AdminProviderEditPage({ params }: Props) {
  const { tenantSlug, id } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const details = await communityProviderService.getDetails(current.tenant.id, id);
  if (!details) notFound();

  const { communityProvider, provider } = details;
  const photos = await providerPhotoService.listByProvider(provider.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/${tenantSlug}/admin/providers`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a proveedores
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{provider.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {provider.city}
          {provider.neighborhood ? ` · ${provider.neighborhood}` : ''}
          {' · '}
          {provider.phone}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ficha del proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <FichaForm
            tenantId={current.tenant.id}
            providerId={provider.id}
            comunidades={provider.communityCount}
            inicial={{
              name: provider.name,
              phone: provider.phone,
              whatsappNumber: provider.whatsappNumber,
              isWhatsapp: provider.isWhatsapp,
              city: provider.city,
              neighborhood: provider.neighborhood,
              instagramHandle: provider.instagramHandle,
              description: provider.description,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos ({photos.length}/6)</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoManager
            tenantId={current.tenant.id}
            providerId={provider.id}
            photos={photos}
          />
        </CardContent>
      </Card>

      <LocalNotes
        tenantId={current.tenant.id}
        communityProviderId={communityProvider.id}
        notes={communityProvider.localNotes}
        canEdit
      />

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <ProviderActions
            tenantId={current.tenant.id}
            communityProvider={communityProvider}
          />
        </CardContent>
      </Card>
    </div>
  );
}
