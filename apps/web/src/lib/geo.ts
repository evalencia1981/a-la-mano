/**
 * Normalización de ciudad y sector.
 *
 * La gente escribe "Medellín", "medellin", "MEDELLIN " y "Medellin" para
 * referirse al mismo lugar. Para poder cruzar comunidades con proveedores
 * se guarda una versión normalizada al lado del texto original: minúsculas,
 * sin tildes, sin espacios de más.
 *
 * Mismo criterio que `normalizePhone` en `lib/contact.ts`: el dato que se
 * muestra es el que escribió la persona; el que se compara es este.
 *
 * OJO: la misma lógica está replicada en SQL dentro de `core.normalizar_texto`
 * (ver `supabase/functions.sql`), porque los triggers la necesitan del lado
 * de la base. Si cambia una, cambia la otra.
 */
export function normalizarUbicacion(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = valor
    .normalize('NFD')
    /* Quita los diacríticos que NFD dejó sueltos (la tilde de "í"). */
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return limpio.length > 0 ? limpio : null;
}

/**
 * Etiqueta legible de dónde queda una comunidad o un proveedor.
 * Devuelve null si no hay nada que mostrar, para poder esconder el bloque.
 */
export function etiquetaUbicacion(
  city: string | null | undefined,
  sector: string | null | undefined,
): string | null {
  const partes = [sector, city].filter((p): p is string => Boolean(p && p.trim()));
  return partes.length > 0 ? partes.join(', ') : null;
}
