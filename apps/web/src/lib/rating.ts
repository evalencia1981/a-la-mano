/**
 * Umbrales de confianza sobre las calificaciones de un proveedor.
 *
 * Viven en `lib/` y no en un service porque los necesitan los dos lados: el
 * servidor para decidir a quién recomendar a otra comunidad, y el cliente
 * para ordenar y etiquetar los proveedores cuando hay que elegir a quién
 * despacharle un trabajo. Tenerlos duplicados terminaría en que uno se
 * ajusta y el otro queda viejo.
 */

/**
 * Cuántas opiniones hacen falta para que un promedio signifique algo.
 *
 * El mínimo importa tanto como el promedio: filtra al que tuvo una sola
 * opinión afortunada. Subirlo hace la señal más confiable pero más escasa —
 * con 5, casi nadie califica lo suficiente.
 */
export const MINIMO_CALIFICACIONES = 3;

/** Promedio a partir del cual un proveedor se recomienda a otra comunidad. */
export const PROMEDIO_MINIMO = 4.0;

/** Tiene suficientes opiniones como para confiar en su promedio. */
export function estaAvalado(calificaciones: number): boolean {
  return calificaciones >= MINIMO_CALIFICACIONES;
}

/**
 * `rating_average` es `numeric` en Postgres y Drizzle lo devuelve como
 * string para no perder precisión. Esto lo pasa a número una sola vez, en
 * lugar de tener `Number(...)` desperdigado por la UI.
 */
export function promedioNumerico(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const n = typeof valor === 'number' ? valor : Number.parseFloat(valor);
  return Number.isFinite(n) ? n : 0;
}

export interface ConCalificacion {
  promedio: number;
  calificaciones: number;
}

/**
 * Orden para elegir a quién contratar.
 *
 * Primero los avalados, y recién dentro de cada grupo por promedio. Sin esa
 * separación, un 5.0 con una sola opinión le gana a un 4.6 con veinte, que
 * es justamente el error que el umbral existe para evitar — y acá pesa más
 * que en ningún otro lado, porque el administrador está por gastar plata
 * de la copropiedad basándose en esto.
 */
export function compararPorCalificacion(a: ConCalificacion, b: ConCalificacion): number {
  const avalA = estaAvalado(a.calificaciones) ? 1 : 0;
  const avalB = estaAvalado(b.calificaciones) ? 1 : 0;
  if (avalA !== avalB) return avalB - avalA;
  if (b.promedio !== a.promedio) return b.promedio - a.promedio;
  return b.calificaciones - a.calificaciones;
}
