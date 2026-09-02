'use client';

import { Check } from 'lucide-react';
import { estiloTinteColor } from '@/lib/category-groups';
import { iconoDe } from '@/lib/category-icons';
import { TIPOS_INCIDENTE, type TipoIncidente } from '@/lib/incident-types';

/**
 * Qué pasó.
 *
 * Es una grilla de botones y no una lista desplegable porque se usa de pie,
 * con una mano: la persona ve las diez opciones a la vez y toca una. Un
 * desplegable esconde el catálogo detrás de un toque extra y obliga a leer
 * en fila lo que acá se reconoce por el ícono.
 *
 * Los de riesgo van primero y con el naranja de urgencia. No son molestias,
 * son accidentes esperando, y esa distinción es la que después le permite a
 * la administración demostrar diligencia sobre lo que venía advertido.
 *
 * Vive en su propio archivo porque lo usan el formulario de reporte y el de
 * corrección. Duplicarlo terminaría en que se agrega un tipo nuevo al
 * catálogo y en una de las dos pantallas no aparece.
 */
export function SelectorTipo({
  valor,
  onCambio,
}: {
  valor: TipoIncidente | null;
  onCambio: (tipo: TipoIncidente) => void;
}) {
  const riesgos = TIPOS_INCIDENTE.filter((t) => t.gravedad === 'riesgo');
  const convivencia = TIPOS_INCIDENTE.filter((t) => t.gravedad === 'convivencia');

  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg font-semibold">¿Qué pasó?</legend>

      <Grupo titulo="Riesgo de accidente" destacado>
        {riesgos.map((t) => (
          <Opcion
            key={t.slug}
            tipo={t}
            activo={valor?.slug === t.slug}
            onClick={() => onCambio(t)}
          />
        ))}
      </Grupo>

      <Grupo titulo="Convivencia">
        {convivencia.map((t) => (
          <Opcion
            key={t.slug}
            tipo={t}
            activo={valor?.slug === t.slug}
            onClick={() => onCambio(t)}
          />
        ))}
      </Grupo>

      {valor && <Elegido tipo={valor} />}
    </fieldset>
  );
}

/**
 * Qué quedó elegido, dicho con todas las letras.
 *
 * Antes esto era una línea de texto gris sobre fondo gris, y contra el
 * degradado se perdía: la persona tocaba una opción y no le quedaba claro
 * cuál había quedado. Ahora repite el nombre en grande, con el ícono y el
 * color de la opción, y el ejemplo pasa al color del texto de la página en
 * vez del secundario.
 */
function Elegido({ tipo }: { tipo: TipoIncidente }) {
  const Icono = iconoDe(tipo.icono);
  const color = colorDeGravedad(tipo);

  return (
    <div style={estiloTinteColor(color)} className="ficha flex items-start gap-3 p-4">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radio-control)]"
        style={{ backgroundColor: color, color: 'var(--color-bg-primary)' }}
      >
        <Icono className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-semibold leading-tight">{tipo.label}</p>
        <p className="mt-1 text-sm leading-snug">{tipo.ejemplo}</p>
      </div>
    </div>
  );
}

function Grupo({
  titulo,
  destacado = false,
  children,
}: {
  titulo: string;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: destacado ? 'var(--color-urgencia)' : 'var(--color-text-secondary)' }}
      >
        {titulo}
      </span>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

/** El color de cada opción: el naranja de urgencia si es un riesgo. */
export function colorDeGravedad(tipo: TipoIncidente): string {
  return tipo.gravedad === 'riesgo' ? 'var(--color-urgencia)' : 'var(--color-accent-primary)';
}

function Opcion({
  tipo,
  activo,
  onClick,
}: {
  tipo: TipoIncidente;
  activo: boolean;
  onClick: () => void;
}) {
  const Icono = iconoDe(tipo.icono);
  return (
    <button
      type="button"
      data-tactil
      data-interactiva
      data-elegida={activo ? '' : undefined}
      onClick={onClick}
      aria-pressed={activo}
      style={estiloTinteColor(colorDeGravedad(tipo))}
      className="ficha foco flex items-center gap-2.5 rounded-[var(--radio-panel)] px-3 py-3 text-left text-sm font-medium"
    >
      <Icono
        className="h-5 w-5 shrink-0"
        style={{ color: colorDeGravedad(tipo) }}
        aria-hidden
      />
      <span className="flex-1 leading-tight">{tipo.label}</span>
      {/* La marca de verificación es lo que no deja lugar a dudas: el color
          se puede confundir con el de al lado, un tilde no. */}
      {activo && (
        <Check className="h-4 w-4 shrink-0" style={{ color: colorDeGravedad(tipo) }} aria-hidden />
      )}
    </button>
  );
}
