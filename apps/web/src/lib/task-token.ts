/**
 * El token que abre una tarea desde el enlace de WhatsApp.
 *
 * Distinto del código de ingreso de `join-code.ts`, y a propósito: aquel se
 * dicta por teléfono y se lee en un chat, así que es corto y sin caracteres
 * confundibles. Este no lo lee nadie —viaja adentro de una URL— así que se
 * optimiza al revés: largo y con todo el alfabeto.
 *
 * 32 caracteres sobre 62 símbolos son ~190 bits. No hay forma de dar con uno
 * probando, que es la única defensa que puede tener algo que abre sin
 * contraseña. Aun así el token no es una identidad: abre **una tarea** y
 * nada más, no da acceso a la comunidad ni a las demás tareas.
 *
 * Se revoca por despacho (`task_dispatches.revoked_at`) sin tocar los otros.
 */
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generarTokenDeTarea(largo = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** URL completa para meter en el mensaje. `origen` sale de `NEXT_PUBLIC_SITE_URL`. */
export function enlaceDeTarea(origen: string, token: string): string {
  return `${origen.replace(/\/$/, '')}/tarea/${token}`;
}

/**
 * Cuánto vive un enlace de despacho.
 *
 * Treinta días es un compromiso: suficiente para un pendiente que se
 * arrastra un par de semanas, corto para que un enlace reenviado en un grupo
 * no siga abriendo un año después. Si vence y la tarea sigue viva, la
 * administración despacha de nuevo y sale un token nuevo.
 */
export const DIAS_VIGENCIA_ENLACE = 30;

export function vencimientoDeEnlace(desde: Date): Date {
  return new Date(desde.getTime() + DIAS_VIGENCIA_ENLACE * 24 * 60 * 60 * 1000);
}
