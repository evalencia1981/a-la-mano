'use client';

import * as React from 'react';

/**
 * Inyecta variables CSS de branding por tenant. Se monta a nivel
 * `[tenantSlug]/layout` y override las variables definidas en
 * `globals.css` solo dentro de ese subtree.
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
  }
  if (secondaryColor) {
    (style as Record<string, string>)['--color-accent-secondary'] = secondaryColor;
  }
  return <div style={style}>{children}</div>;
}
