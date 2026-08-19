/**
 * El mapa físico de la comunidad: qué tipos de lugar hay y cómo se comparan
 * dos nombres para saber si son el mismo lugar.
 *
 * La jerarquía es corta a propósito — torre → piso, y zona suelta. Se puede
 * describir cualquier unidad residencial con eso, y cualquier nivel extra
 * convierte el selector en un árbol imposible de usar caminando.
 */

export type TipoLugar = 'torre' | 'piso' | 'zona';

export interface DefinicionLugar {
  kind: TipoLugar;
  label: string;
  plural: string;
  /** Ícono de `lib/category-icons.ts`. */
  icono: string;
  /** Si es true, no existe suelto: siempre cuelga de una torre. */
  requiereTorre: boolean;
}

export const TIPOS_LUGAR: DefinicionLugar[] = [
  {
    kind: 'torre',
    label: 'Torre o bloque',
    plural: 'Torres y bloques',
    icono: 'building',
    requiereTorre: false,
  },
  {
    kind: 'piso',
    label: 'Piso',
    plural: 'Pisos',
    icono: 'arrow-up-down',
    requiereTorre: true,
  },
  {
    kind: 'zona',
    label: 'Zona común',
    plural: 'Zonas comunes',
    icono: 'trees',
    requiereTorre: false,
  },
];

const POR_KIND = new Map(TIPOS_LUGAR.map((t) => [t.kind, t]));

export function tipoLugar(kind: string): DefinicionLugar | undefined {
  return POR_KIND.get(kind as TipoLugar);
}

export function esTipoLugar(valor: string): valor is TipoLugar {
  return POR_KIND.has(valor as TipoLugar);
}

/**
 * Zonas que tiene casi toda unidad. No es una lista cerrada: es para que
 * cargar el mapa sea tocar ocho chips y no escribir ocho nombres.
 *
 * Cargar el mapa es media hora aburrida para el administrador, y esa media
 * hora es la que decide si el módulo se usa o no. Todo lo que la acorte
 * vale más que cualquier función que venga después.
 */
export const ZONAS_SUGERIDAS: string[] = [
  'Portería',
  'Parqueadero',
  'Gimnasio',
  'Salón social',
  'Piscina',
  'Parque infantil',
  'Zona BBQ',
  'Ascensores',
  'Shut de basuras',
  'Cuarto de basuras',
  'Terraza',
  'Cancha',
];

/**
 * Palabras que la gente dicta en vez de teclear. Sin esto, "torre uno" y
 * "torre 1" son dos torres distintas — y el administrador va a dictar, no
 * a teclear, que es todo el punto del módulo.
 *
 * Solo cardinales. Los ordinales quedan afuera a propósito: "cuarto" es
 * tanto el número cuatro como un lugar real ("Cuarto de basuras", "Cuarto
 * de bombas"), y confundirlos ensucia el mapa de una forma difícil de ver.
 */
const NUMEROS: Record<string, string> = {
  cero: '0', uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4',
  cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10',
  once: '11', doce: '12', trece: '13', catorce: '14', quince: '15',
  dieciseis: '16', diecisiete: '17', dieciocho: '18', diecinueve: '19',
  veinte: '20',
};

/**
 * Clave de matching de un lugar — el equivalente de `phoneNormalized` en
 * `providers`, y por la misma razón: sin una clave estable, la misma torre
 * entra a la base cuatro veces con cuatro nombres.
 *
 *   "Torre 1"  →  "torre1"
 *   "TORRE  1" →  "torre1"
 *   "Torre uno"→  "torre1"
 *   "Sótano 1" →  "sotano1"
 *
 * Tokeniza antes de limpiar para que el reemplazo de números sea por
 * palabra completa: si fuera por substring, "Neptuno" terminaría en
 * "neptu1".
 */
export function normalizarLugar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas de acento, ya separadas por NFD
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => NUMEROS[token] ?? token)
    .join('');
}

/** Un lugar tal como lo necesita el selector, ya aplanado. */
export interface LugarOpcion {
  id: string;
  kind: TipoLugar;
  name: string;
  normalized: string;
  parentId: string | null;
  /** "Torre 1 · Piso 5" — lo que se guarda como texto en el reporte. */
  rutaCompleta: string;
}

/**
 * Busca un lugar del mapa por lo que alguien escribió.
 *
 * Primero por clave exacta, después por ruta completa ("torre1piso5"). No
 * hace fuzzy a propósito: adivinar mal el lugar de un reporte es peor que
 * no adivinarlo, porque el error queda invisible dentro de una estadística
 * que después se le presenta al consejo.
 */
export function buscarLugar(texto: string, lugares: LugarOpcion[]): LugarOpcion | null {
  const clave = normalizarLugar(texto);
  if (!clave) return null;
  return (
    lugares.find((l) => l.normalized === clave) ??
    lugares.find((l) => normalizarLugar(l.rutaCompleta) === clave) ??
    null
  );
}
