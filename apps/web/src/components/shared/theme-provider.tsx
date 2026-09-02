'use client';

import * as React from 'react';
import { tintaSobre } from '@/lib/contraste';

/**
 * Inyecta variables CSS de branding por tenant. Se monta a nivel
 * `[tenantSlug]/layout` y override las variables definidas en
 * `globals.css` solo dentro de ese subtree.
 *
 * Junto con el acento va su tinta, que es lo que se lee ENCIMA: el texto de
 * los botones, el ícono de los chips. Y se calcula del color, no del modo
 * claro/oscuro.
 *
 * Esa distinción es la que hace que esto funcione. La tinta por modo sirve
 * mientras el acento sea el nuestro, pero acá el color lo pone la
 * comunidad: una unidad con marca morada oscura tenía el botón "Guardar"
 * con letra navy encima —invisible—, y una con marca amarilla lo tendría
 * con letra blanca, igual de invisible. Midiendo el color contra las dos
 * tintas y quedándose con la que gana, los dos casos salen bien sin que
 * nadie tenga que elegir nada.
 */
export function TenantThemeProvider({
  primaryColor,
  secondaryColor,
  children,
}: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  children: React.ReactNode;
}) {
  const style: React.CSSProperties = {};
  if (primaryColor) {
    (style as Record<string, string>)['--color-accent-primary'] = primaryColor;
    (style as Record<string, string>)['--color-accent-ink'] = tintaSobre(primaryColor);
  }
  if (secondaryColor) {
    (style as Record<string, string>)['--color-accent-secondary'] = secondaryColor;
  }
  return <div style={style}>{children}</div>;
}
