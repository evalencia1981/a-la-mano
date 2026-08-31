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

import type * as React from 'react';

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
  '#1b7a8c', // petróleo medio
  '#2fb8a8', // verde mar
  '#35c4e0', // cian cielo
  '#63e0a8', // primavera claro
  '#2c5f7a', // pizarra azulada
  '#17a69b', // turquesa profundo
  '#4c8fb0', // azul empolvado
  '#7bdcc8', // agua pálido
] as const;

/** Hash estable de un texto. Mismo nombre, mismo color, siempre. */
function indiceDeColor(texto: string): number {
  let acumulado = 0;
  for (let i = 0; i < texto.length; i += 1) {
    acumulado = (acumulado * 31 + texto.charCodeAt(i)) % 100000;
  }
  return acumulado % PALETA_EXTRA.length;
}

/*
 * Los dos extremos de la rampa, en valor absoluto.
 *
 * No son `var(--color-text-primary)` ni `var(--color-bg-primary)` a
 * propósito: esos se invierten en modo oscuro, y la tinta tiene que
 * depender del color que tiene DEBAJO, no del modo. Un chip aguamarina
 * lleva tinta navy de día y de noche.
 */
const TINTA_OSCURA = '#213a58';
const TINTA_CLARA = '#fbfefd';

/**
 * Luminancia relativa de un hex (fórmula de WCAG). Se usa para decidir la
 * tinta de los colores que no están en el catálogo: los grupos nuevos y,
 * más adelante, cualquier color que cargue una comunidad.
 */
function luminancia(hex: string): number {
  const limpio = hex.replace('#', '');
  const canal = (i: number) => {
    const v = Number.parseInt(limpio.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Tinta legible sobre un color dado. El umbral está donde la rampa cruza. */
export function tintaSobre(color: string): string {
  if (!color.startsWith('#')) return TINTA_CLARA;
  return luminancia(color) > 0.35 ? TINTA_OSCURA : TINTA_CLARA;
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

/**
 * Tinta del grupo: el color que va ENCIMA de `colorDeGrupo` a plena
 * saturación — el ícono del chip, sobre todo.
 *
 * Existe porque la rampa de la paleta cruza el umbral de luminosidad en el
 * medio: blanco sobre el aguamarina da 1.5:1 y el ícono desaparece. Los
 * cinco grupos del catálogo la traen resuelta en `globals.css` (cambia con
 * el modo claro/oscuro); los grupos nuevos la calculan de su hex.
 */
export function tintaDeGrupo(groupName: string | null | undefined): string {
  if (!groupName) return 'var(--color-grupo-otros-tinta)';
  const conocido = POR_NOMBRE[groupName];
  if (conocido) return `var(--color-grupo-${conocido}-tinta)`;
  return tintaSobre(PALETA_EXTRA[indiceDeColor(groupName.trim().toLowerCase())]!);
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

/**
 * Estilo que enciende el tinte de una ficha (`.ficha` en `globals.css`).
 *
 * Existe para no repetir el cast en cada componente: `--tinte` es una
 * propiedad personalizada y `React.CSSProperties` solo conoce las
 * estándar. Un solo lugar que castea es mejor que veinte.
 */
export function estiloTinte(groupName: string | null | undefined): React.CSSProperties {
  return {
    '--tinte': colorDeGrupo(groupName),
    '--tinta': tintaDeGrupo(groupName),
  } as React.CSSProperties;
}

/**
 * Igual que `estiloTinte` pero con un color ya resuelto (estado, urgencia).
 *
 * `tinta` solo hace falta si ese color se va a usar a plena saturación
 * debajo de algo. Para un tinte de fondo al 20% no cambia nada, porque el
 * texto sigue siendo el de la página.
 */
export function estiloTinteColor(color: string, tinta?: string): React.CSSProperties {
  return {
    '--tinte': color,
    ...(tinta ? { '--tinta': tinta } : {}),
  } as React.CSSProperties;
}
