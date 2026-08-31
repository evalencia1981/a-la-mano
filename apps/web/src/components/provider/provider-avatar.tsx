import { iconoDe } from '@/lib/category-icons';
import { colorDeGrupo, tintaDeGrupo } from '@/lib/category-groups';
import type { Category, ProviderPhoto } from '@a-la-mano/db';

/**
 * Bloque visual de un proveedor: su foto si la subió, y si no, el ícono
 * del oficio sobre el color de su grupo.
 *
 * Un ícono de oficio comunica mucho más que una inicial genérica, y evita
 * que el directorio se vea vacío mientras las comunidades todavía no
 * cargaron fotos. El catálogo de íconos vive en `lib/category-icons.ts`.
 */
export function ProviderAvatar({
  photo,
  category,
  nombre,
  className = '',
  tamañoIcono = 28,
}: {
  photo: ProviderPhoto | null;
  category?: Pick<Category, 'iconName' | 'groupName'> | null;
  nombre: string;
  className?: string;
  tamañoIcono?: number;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo.publicUrl}
        alt={`Trabajo de ${nombre}`}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    );
  }

  const Icono = iconoDe(category?.iconName);

  return (
    <div
      aria-hidden
      className={`flex items-center justify-center ${className}`}
      style={{
        backgroundColor: colorDeGrupo(category?.groupName),
        color: tintaDeGrupo(category?.groupName),
      }}
    >
      <Icono width={tamañoIcono} height={tamañoIcono} strokeWidth={1.5} />
    </div>
  );
}
