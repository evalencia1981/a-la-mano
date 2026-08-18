/**
 * Código del enlace de ingreso de una comunidad.
 *
 * Ocho caracteres de un alfabeto sin los que se confunden al leerlos en un
 * chat o dictarlos por teléfono: no hay O ni 0, ni I ni 1, ni L. Corto para
 * que entre en un mensaje de WhatsApp, y con suficiente entropía
 * (31^8 ≈ 850 mil millones) para que no se adivine probando.
 *
 * No es un secreto criptográfico: es una llave de puerta. Si se filtra fuera
 * del edificio, el administrador la rota y la anterior deja de abrir.
 */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generarCodigoDeIngreso(largo = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** URL completa para compartir. `origen` sale de `NEXT_PUBLIC_SITE_URL`. */
export function enlaceDeIngreso(origen: string, codigo: string): string {
  return `${origen.replace(/\/$/, '')}/unirse/${codigo}`;
}
