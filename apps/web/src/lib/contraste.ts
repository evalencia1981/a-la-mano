/**
 * Elegir el color que se lee encima de otro.
 *
 * Existe porque la app tiene colores que no controlamos: el que cada
 * comunidad carga como su marca. Un botón con el color de la copropiedad y
 * la letra fija en blanco funciona hasta que alguien elige un amarillo; con
 * la letra fija en oscuro, hasta que alguien elige un morado. Los dos casos
 * terminan igual — un botón que no se puede leer — y ninguna paleta nuestra
 * los evita, porque el color lo pone otro.
 *
 * También lo usan los grupos de categoría que no están en el catálogo, por
 * el mismo motivo: su color sale de una tabla y no de una variable CSS con
 * versión clara y oscura.
 */

/** Los dos extremos de la rampa. Son valores absolutos: no cambian con el
 * modo, porque lo que decide es el color que tienen debajo, no la hora. */
export const TINTA_OSCURA = '#213a58';
export const TINTA_CLARA = '#fbfefd';

/** Normaliza `#abc` y `abc` a los seis dígitos de `#aabbcc`. */
function normalizarHex(color: string): string | null {
  const limpio = color.trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(limpio)) {
    return limpio
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return /^[0-9a-fA-F]{6}$/.test(limpio) ? limpio : null;
}

/** Luminancia relativa, fórmula de WCAG. */
export function luminancia(color: string): number | null {
  const hex = normalizarHex(color);
  if (!hex) return null;
  const canal = (i: number) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Relación de contraste entre dos colores. 1 es idéntico, 21 es el máximo. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return 1;
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * La tinta que mejor se lee sobre un color.
 *
 * Compara las dos y devuelve la que gana, en vez de cortar por un umbral
 * fijo de luminosidad. Con un umbral, un color justo en la frontera se
 * queda con la tinta que apenas pasa; comparando, siempre sale la mejor de
 * las dos que tenemos.
 *
 * Si el color no es un hex — por ejemplo `var(--color-urgencia)` — devuelve
 * la tinta clara: no hay nada que medir en tiempo de ejecución, y el que
 * pasa una variable CSS ya se hace cargo del contraste desde el CSS.
 */
export function tintaSobre(color: string): string {
  if (luminancia(color) === null) return TINTA_CLARA;
  return contraste(color, TINTA_CLARA) >= contraste(color, TINTA_OSCURA)
    ? TINTA_CLARA
    : TINTA_OSCURA;
}
