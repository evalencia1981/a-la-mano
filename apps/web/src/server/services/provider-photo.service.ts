import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { providerPhotoRepository } from '@/server/repositories/provider-photo.repository';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { assertAuthenticated } from '@/lib/auth/guards';
import type { ProviderPhoto } from '@a-la-mano/db';

const MAX_PHOTOS_PER_PROVIDER = 6;
const STORAGE_BUCKET = 'providers-photos';
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  photo: ProviderPhoto;
}

export const providerPhotoService = {
  async listByProvider(providerId: string) {
    return providerPhotoRepository.listByProvider(providerId);
  },

  /**
   * Procesa la imagen con sharp (resize máx 1920x1080, WebP calidad 85),
   * la sube a Supabase Storage, y crea el registro en `directory.provider_photos`.
   * Si es la primera foto del provider, queda marcada como primary.
   *
   * Valida:
   *  - mime type permitido (jpeg/png/webp)
   *  - tamaño máximo 5MB
   *  - máximo 6 fotos por provider
   */
  async upload(
    providerId: string,
    file: File,
    altText?: string,
  ): Promise<UploadResult> {
    const user = await assertAuthenticated();

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo JPEG, PNG o WebP.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('La imagen supera el máximo de 5 MB.');
    }

    const currentCount = await providerPhotoRepository.countByProvider(providerId);
    if (currentCount >= MAX_PHOTOS_PER_PROVIDER) {
      throw new Error(`Máximo ${MAX_PHOTOS_PER_PROVIDER} fotos por proveedor.`);
    }

    // Procesar con sharp.
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processed = sharp(inputBuffer).rotate().resize(1920, 1080, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    const metadata = await processed.metadata();
    const webpBuffer = await processed.webp({ quality: 85 }).toBuffer();

    // Subir a Storage. Path: {providerId}/{uuid}.webp
    const fileName = `${randomUUID()}.webp`;
    const storagePath = `${providerId}/${fileName}`;
    const supabase = createServiceRoleClient();
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: false,
      });
    if (uploadError) {
      throw new Error(`No se pudo subir la foto: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    const photo = await providerPhotoRepository.create({
      providerId,
      storagePath,
      publicUrl,
      altText: altText ?? null,
      displayOrder: currentCount,
      isPrimary: currentCount === 0,
      fileSize: webpBuffer.byteLength,
      mimeType: 'image/webp',
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      uploadedBy: user.id,
    });

    return { photo };
  },

  async delete(photoId: string): Promise<void> {
    await assertAuthenticated();
    const photo = await providerPhotoRepository.getById(photoId);
    if (!photo) throw new Error('Foto no encontrada.');

    // Borrar del storage. Si falla, igual borramos el row para no dejar zombies.
    const supabase = createServiceRoleClient();
    await supabase.storage.from(STORAGE_BUCKET).remove([photo.storagePath]);
    await providerPhotoRepository.delete(photoId);

    // Si era la primary, promovemos la primera foto restante.
    if (photo.isPrimary) {
      const next = await providerPhotoRepository.firstByProvider(photo.providerId);
      if (next) {
        await providerPhotoRepository.setPrimary(photo.providerId, next.id);
      }
    }
  },

  async setPrimary(providerId: string, photoId: string): Promise<void> {
    await assertAuthenticated();
    await providerPhotoRepository.setPrimary(providerId, photoId);
  },

  async reorder(providerId: string, photoIds: string[]): Promise<void> {
    await assertAuthenticated();
    // Aplicar en serie por simplicidad — son ≤ 6 fotos.
    await Promise.all(
      photoIds.map((id, idx) => providerPhotoRepository.updateOrder(id, idx)),
    );
  },
};

export const PROVIDER_PHOTO_LIMITS = {
  MAX_PHOTOS_PER_PROVIDER,
  MAX_FILE_BYTES,
  ACCEPTED_MIME_TYPES,
} as const;
