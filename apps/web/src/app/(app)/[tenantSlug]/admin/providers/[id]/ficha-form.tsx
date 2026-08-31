'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { actualizarProveedorAction } from '@/server/actions/provider.actions';

interface Props {
  tenantId: string;
  providerId: string;
  /** En cuántas comunidades está este proveedor, incluida la actual. */
  comunidades: number;
  inicial: {
    name: string;
    phone: string;
    whatsappNumber: string | null;
    isWhatsapp: boolean;
    city: string;
    neighborhood: string | null;
    instagramHandle: string | null;
    description: string | null;
  };
}

/**
 * Editar la ficha de un proveedor.
 *
 * Faltaba, y no era solo una molestia: un administrador que cargaba mal un
 * teléfono no tenía cómo corregirlo desde ningún lado. Los números cambian
 * y un proveedor con el teléfono viejo es un proveedor perdido.
 *
 * La advertencia sobre otras comunidades no es decorativa: `providers` es
 * una entidad global de la plataforma, así que este formulario le cambia la
 * ficha a todas las copropiedades que lo tengan. Quien edita merece saberlo
 * antes de guardar, no después.
 */
export function FichaForm({ tenantId, providerId, comunidades, inicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const [name, setName] = useState(inicial.name);
  const [phone, setPhone] = useState(inicial.phone);
  const [whatsappNumber, setWhatsappNumber] = useState(inicial.whatsappNumber ?? '');
  const [isWhatsapp, setIsWhatsapp] = useState(inicial.isWhatsapp);
  const [city, setCity] = useState(inicial.city);
  const [neighborhood, setNeighborhood] = useState(inicial.neighborhood ?? '');
  const [instagramHandle, setInstagramHandle] = useState(inicial.instagramHandle ?? '');
  const [description, setDescription] = useState(inicial.description ?? '');

  const sucio =
    name !== inicial.name ||
    phone !== inicial.phone ||
    whatsappNumber !== (inicial.whatsappNumber ?? '') ||
    isWhatsapp !== inicial.isWhatsapp ||
    city !== inicial.city ||
    neighborhood !== (inicial.neighborhood ?? '') ||
    instagramHandle !== (inicial.instagramHandle ?? '') ||
    description !== (inicial.description ?? '');

  function guardar() {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const result = await actualizarProveedorAction(tenantId, providerId, {
        name: name.trim(),
        phone: phone.trim(),
        isWhatsapp,
        whatsappNumber: whatsappNumber.trim() || null,
        city: city.trim(),
        neighborhood: neighborhood.trim() || null,
        instagramHandle: instagramHandle.trim() || null,
        description: description.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGuardado(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {comunidades > 1 && (
        <p className="flex items-start gap-2 rounded-[var(--radio-control)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-sm">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: 'var(--color-urgencia)' }}
            aria-hidden
          />
          <span>
            Este proveedor está en <strong>{comunidades} comunidades</strong>. Lo que cambies
            acá les cambia la ficha a todas. Lo único propio de esta comunidad son las notas
            locales, y esas no se tocan desde este formulario.
          </span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" id="prov-name">
          <input
            id="prov-name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo
          etiqueta="Teléfono"
          id="prov-phone"
          ayuda="Con indicativo de país: +57 300 123 4567"
        >
          <input
            id="prov-phone"
            value={phone}
            maxLength={30}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo etiqueta="Ciudad" id="prov-city">
          <input
            id="prov-city"
            value={city}
            maxLength={80}
            onChange={(e) => setCity(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo etiqueta="Barrio o sector" id="prov-neigh" ayuda="Opcional">
          <input
            id="prov-neigh"
            value={neighborhood}
            maxLength={80}
            onChange={(e) => setNeighborhood(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo
          etiqueta="WhatsApp distinto"
          id="prov-wa"
          ayuda="Solo si atiende WhatsApp en otro número"
        >
          <input
            id="prov-wa"
            value={whatsappNumber}
            maxLength={30}
            inputMode="tel"
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>

        <Campo etiqueta="Instagram" id="prov-ig" ayuda="Sin la arroba">
          <input
            id="prov-ig"
            value={instagramHandle}
            maxLength={60}
            onChange={(e) => setInstagramHandle(e.target.value)}
            className={CLASE_INPUT}
          />
        </Campo>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isWhatsapp}
          onChange={(e) => setIsWhatsapp(e.target.checked)}
          className="h-4 w-4"
        />
        El teléfono principal atiende WhatsApp
      </label>

      <Campo etiqueta="Descripción" id="prov-desc" ayuda="Qué hace, horarios, cobertura">
        <textarea
          id="prov-desc"
          value={description}
          rows={3}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
          className={`${CLASE_INPUT} h-auto py-2.5`}
        />
      </Campo>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-tactil
          disabled={isPending || !sucio || !name.trim() || !phone.trim()}
          onClick={guardar}
          className="h-11 rounded-[var(--radio-panel)] bg-[var(--color-accent-primary)] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {guardado && !sucio && (
          <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <Check className="h-4 w-4" style={{ color: 'var(--color-success)' }} aria-hidden />
            Guardado
          </span>
        )}
      </div>
    </div>
  );
}

const CLASE_INPUT =
  'h-11 w-full campo px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]';

function Campo({
  etiqueta,
  id,
  ayuda,
  children,
}: {
  etiqueta: string;
  id: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className="text-xs text-[var(--color-text-secondary)]">{ayuda}</p>}
    </div>
  );
}
