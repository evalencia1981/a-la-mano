import type { Provider } from '@a-la-mano/db';

/**
 * Helpers para construir URLs de contacto (WhatsApp, llamada, Instagram).
 * Toda función retorna `string | null` cuando el dato puede no existir —
 * usar el null en la UI para esconder el botón correspondiente.
 */

/**
 * Solo dígitos. Se usa también server-side para matching de proveedores.
 */
export function normalizePhone(phone: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

/**
 * URL de WhatsApp para el provider:
 *  - Si el teléfono principal es WhatsApp → wa.me/{phoneNormalized}
 *  - Si hay un whatsappNumber distinto → wa.me/{whatsappNormalized}
 *  - Si no → null (esconder el botón)
 *
 * `mensaje` viaja como texto ya escrito en el chat. WhatsApp NO lo envía
 * solo: la persona lo ve, lo edita si quiere y recién ahí toca enviar.
 */
export function getWhatsappUrl(
  provider: Pick<Provider, 'isWhatsapp' | 'phoneNormalized' | 'whatsappNormalized'>,
  mensaje?: string | null,
): string | null {
  const numero =
    provider.isWhatsapp && provider.phoneNormalized
      ? provider.phoneNormalized
      : provider.whatsappNormalized;
  return getWhatsappUrlDeNumero(numero, mensaje);
}

/**
 * La misma URL pero a partir de un número suelto, sin provider de por medio.
 *
 * La usa el despacho de pendientes: el destinatario es la línea de un puesto
 * de trabajo —el celular que está en la portería— y eso no es un proveedor
 * del directorio.
 */
export function getWhatsappUrlDeNumero(
  numeroNormalizado: string | null | undefined,
  mensaje?: string | null,
): string | null {
  if (!numeroNormalizado) return null;
  const texto = mensaje?.trim();
  return texto
    ? `https://wa.me/${numeroNormalizado}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/${numeroNormalizado}`;
}

/**
 * Presentación con la que arranca el chat cuando un vecino escribe a un
 * proveedor del directorio.
 *
 * Dice tres cosas, y las tres importan:
 *
 *  1. Quién escribe, para que el proveedor no reciba un "hola" de un número
 *     desconocido.
 *  2. De qué comunidad, que es lo que da confianza y contexto de zona.
 *  3. Que el contacto salió del directorio. Sin esto el proveedor nunca se
 *     entera de que la app le trae trabajo — y si no lo sabe, jamás va a
 *     pagar por estar en ella.
 *
 * A propósito NO incluye número de apartamento ni dirección: eso lo dice
 * cada quien si quiere, cuando ya decidió contratar.
 */
export function armarMensajeContacto({
  proveedor,
  residente,
  comunidad,
  sector,
}: {
  proveedor: string;
  residente?: string | null;
  comunidad: string;
  sector?: string | null;
}): string {
  const quien = residente?.trim() ? `Soy ${residente.trim()}, de` : 'Escribo desde';
  const donde = sector?.trim() ? `${comunidad} (${sector.trim()})` : comunidad;
  return `Hola ${proveedor}, buen día. ${quien} ${donde}. Los encontré en el directorio de proveedores de la comunidad y quería consultarles por un servicio.`;
}

export function getInstagramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;
  return `https://instagram.com/${clean}`;
}

export function getTelUrl(phone: string): string {
  return `tel:+${normalizePhone(phone)}`;
}
