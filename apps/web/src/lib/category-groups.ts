/**
 * Traduce el `group_name` de una categoría al color de su pestaña y a una
 * etiqueta corta para la UI.
 *
 * El agrupamiento ya existe en `directory.categories.group_name` (lo define
 * Platform Admin), así que la franja de color de cada ficha comunica algo
 * verdadero del dato en vez de decorar: dos servicios del mismo grupo se
 * reconocen de un vistazo al recorrer la lista.
 *
 * Si aparece un grupo nuevo que no esté acá, cae en "otros" — no rompe nada.
 */

export type GrupoCategoria = 'hogar' | 'limpieza' | 'exterior' | 'comunidad' | 'otros';

const POR_NOMBRE: Record<string, GrupoCategoria> = {
  'Reparaciones y mantenimiento del hogar': 'hogar',
  'Limpieza y aseo': 'limpieza',
  'Exterior y jardín': 'exterior',
  'Servicios para la comunidad / edificio': 'comunidad',
  Otros: 'otros',
};

/**
 * Colores para grupos que no son los cinco originales.
 *
 * Un grupo nuevo ("Belleza y cuidado personal") necesita un color propio, o
 * termina ocre junto con "Otros" y deja de distinguirse en la lista. En vez
 * de pedir que alguien lo elija, se asigna de esta paleta según el nombre:
 * el mismo grupo siempre recibe el mismo color, y son tonos que funcionan
 * tanto en claro como en oscuro.
 *
 * Si en algún momento hace falta elegir el color a mano, esto pasa a ser una
 * tabla `directory.category_groups` con su columna de color.
 */
const PALETA_EXTRA = [
  '#B0407A', // magenta
  '#2E7D8F', // petróleo
  '#C2622D', // cobre
  '#5B7BC7', // azul lavanda
  '#7A9A2E', // oliva
  '#9B5DE0', // violeta
  '#0F8A7E', // verde azulado
  '#C4913A', // mostaza
] as const;

/** Hash estable de un texto. Mismo nombre, mismo color, siempre. */
function indiceDeColor(texto: string): number {
  let acumulado = 0;
  for (let i = 0; i < texto.length; i += 1) {
    acumulado = (acumulado * 31 + texto.charCodeAt(i)) % 100000;
  }
  return acumulado % PALETA_EXTRA.length;
}

const ETIQUETA_CORTA: Record<GrupoCategoria, string> = {
  hogar: 'Hogar',
  limpieza: 'Limpieza',
  exterior: 'Exterior',
  comunidad: 'Comunidad',
  otros: 'Otros',
};

export function grupoDe(groupName: string | null | undefined): GrupoCategoria {
  if (!groupName) return 'otros';
  return POR_NOMBRE[groupName] ?? 'otros';
}

/**
 * Color del grupo. Los cinco originales usan variables CSS de `globals.css`
 * (se adaptan al modo oscuro); los grupos nuevos toman un color fijo de la
 * paleta extra, elegido por su nombre.
 */
export function colorDeGrupo(groupName: string | null | undefined): string {
  if (!groupName) return 'var(--color-grupo-otros)';
  const conocido = POR_NOMBRE[groupName];
  if (conocido) return `var(--color-grupo-${conocido})`;
  return PALETA_EXTRA[indiceDeColor(groupName.trim().toLowerCase())]!;
}

/** Si el grupo es uno de los cinco originales del catálogo. */
export function esGrupoOriginal(groupName: string): boolean {
  return groupName in POR_NOMBRE;
}

/**
 * Etiqueta corta para los filtros del directorio. Los cinco grupos
 * originales tienen nombres largos ("Reparaciones y mantenimiento del
 * hogar") que no entran en un chip; los grupos nuevos se muestran tal como
 * los escribieron.
 */
export function etiquetaDeGrupo(groupName: string | null | undefined): string {
  if (!groupName) return ETIQUETA_CORTA.otros;
  const conocido = POR_NOMBRE[groupName];
  return conocido ? ETIQUETA_CORTA[conocido] : groupName;
}

/**
 * Una categoría es de urgencia si atiende 24h. Hoy se detecta por slug —
 * las dos que existen en el seed terminan en `-24h`. Si más adelante hay
 * que marcarlas explícitamente, esto pasa a ser una columna de la tabla.
 */
export function esUrgencia(slug: string | null | undefined): boolean {
  return Boolean(slug?.endsWith('-24h'));
}
