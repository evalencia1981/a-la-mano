/**
 * Tipos de reporte de convivencia y riesgo.
 *
 * Salieron de mensajes reales de grupos de WhatsApp de unidades, no de una
 * lluvia de ideas: chicos corriendo por la rampa vehicular, chicos alzando
 * pesas en el gimnasio, desechos arrojados desde los balcones. Si la lista
 * no refleja lo que de verdad pasa, nadie la usa.
 *
 * Los de tipo `riesgo` van primero y se marcan distinto: no son molestias,
 * son accidentes esperando. Esa distinción es la que después le permite a
 * la administración demostrar diligencia sobre lo que venía advertido.
 */

export type GravedadIncidente = 'riesgo' | 'convivencia';

export interface TipoIncidente {
  slug: string;
  label: string;
  /** Ayuda a elegir sin ambigüedad. */
  ejemplo: string;
  gravedad: GravedadIncidente;
  /** Ícono de `lib/category-icons.ts`. */
  icono: string;
}

export const TIPOS_INCIDENTE: TipoIncidente[] = [
  {
    slug: 'menores-zona-vehicular',
    label: 'Menores en zona vehicular',
    ejemplo: 'Chicos jugando o corriendo por rampas, sótanos o parqueaderos.',
    gravedad: 'riesgo',
    icono: 'car',
  },
  {
    slug: 'uso-indebido-gimnasio',
    label: 'Uso indebido del gimnasio',
    ejemplo: 'Menores sin acompañante, uso de pesas sin supervisión.',
    gravedad: 'riesgo',
    icono: 'dumbbell',
  },
  {
    slug: 'objetos-desde-balcones',
    label: 'Objetos arrojados desde balcones',
    ejemplo: 'Colillas, empaques, pelo de mascotas, agua de trapeadores.',
    gravedad: 'riesgo',
    icono: 'building',
  },
  {
    slug: 'riesgo-zonas-comunes',
    label: 'Riesgo en zonas comunes',
    ejemplo: 'Piso suelto, baranda floja, luz quemada, tapa levantada.',
    gravedad: 'riesgo',
    icono: 'shield',
  },
  {
    slug: 'mascotas',
    label: 'Mascotas',
    ejemplo: 'Desechos sin recoger, animales sueltos o sin correa.',
    gravedad: 'convivencia',
    icono: 'dog',
  },
  {
    slug: 'ruido',
    label: 'Ruido',
    ejemplo: 'Música alta, fiestas fuera de horario, obras a deshora.',
    gravedad: 'convivencia',
    icono: 'music',
  },
  {
    slug: 'mal-parqueo',
    label: 'Mal parqueo',
    ejemplo: 'Vehículos en celda ajena, en zona de circulación o bloqueando salidas.',
    gravedad: 'convivencia',
    icono: 'car',
  },
  {
    slug: 'basuras',
    label: 'Basuras',
    ejemplo: 'Bolsas fuera del shut o en horario equivocado, reciclaje mal separado.',
    gravedad: 'convivencia',
    icono: 'sparkles',
  },
  {
    slug: 'dano-zonas-comunes',
    label: 'Daño en zonas comunes',
    ejemplo: 'Rayones, vidrios rotos, equipos del salón social o del gimnasio.',
    gravedad: 'convivencia',
    icono: 'hammer',
  },
];

const POR_SLUG = new Map(TIPOS_INCIDENTE.map((t) => [t.slug, t]));

export function tipoIncidente(slug: string): TipoIncidente | undefined {
  return POR_SLUG.get(slug);
}

export function etiquetaIncidente(slug: string): string {
  return POR_SLUG.get(slug)?.label ?? slug;
}

export const ESTADOS_INCIDENTE = {
  nuevo: 'Sin revisar',
  en_proceso: 'En gestión',
  resuelto: 'Resuelto',
} as const;

export type EstadoIncidente = keyof typeof ESTADOS_INCIDENTE;

/**
 * Un reporte se puede editar mientras la administración no lo haya tomado.
 *
 * Vive acá y no en el service porque lo necesitan los dos lados: el
 * servidor para rechazar la edición, y el cliente para decidir si muestra
 * el botón. Tenerlo duplicado terminaría en que uno se ajusta y el otro
 * queda viejo — y la versión vieja sería la que le ofrece al vecino un
 * botón que el servidor le va a rechazar.
 *
 * El corte es `nuevo`. En cuanto pasa a "En gestión" hay alguien actuando
 * sobre lo que dice el reporte: cambiarle el tipo o el lugar por debajo
 * convierte el trabajo de esa persona en algo que ya no corresponde a nada.
 */
export function sePuedeEditar(status: string): boolean {
  return status === 'nuevo';
}
