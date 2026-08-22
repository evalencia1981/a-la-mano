/**
 * Estados de un pendiente, puestos sugeridos y el mensaje con el que se
 * despacha por WhatsApp.
 */

/**
 * Cuatro estados, no seis.
 *
 * El administrador los enumeró así: "pendiente, en proceso, suspendido,
 * atendido, terminado, finalizado". Los últimos tres son el mismo estado con
 * tres nombres, y una lista de seis botones donde tres significan lo mismo
 * no da precisión: da dudas antes de tocar. Se quedan los cuatro que
 * describen situaciones distintas de verdad.
 *
 * `suspendido` es el que de verdad le importa: es el único que exige motivo.
 * Su pregunta textual fue "y si no lo atendieron, ¿por qué?" — un estado sin
 * respuesta a eso no le sirve para nada.
 */
export const ESTADOS_TAREA = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  suspendido: 'Suspendido',
  resuelto: 'Resuelto',
} as const;

export type EstadoTarea = keyof typeof ESTADOS_TAREA;

export const ORDEN_ESTADOS: EstadoTarea[] = [
  'pendiente',
  'en_proceso',
  'suspendido',
  'resuelto',
];

export function esEstadoTarea(valor: string): valor is EstadoTarea {
  return valor in ESTADOS_TAREA;
}

/** Sigue ocupando a alguien. Es lo que va arriba en la bandeja. */
export function estaAbierta(estado: string): boolean {
  return estado !== 'resuelto';
}

/**
 * Un pendiente suspendido sin motivo es un pendiente perdido con otro
 * nombre: dentro de un mes nadie va a saber por qué se frenó.
 */
export function exigeMotivo(estado: string): boolean {
  return estado === 'suspendido';
}

export const COLOR_ESTADO: Record<EstadoTarea, string> = {
  pendiente: 'var(--color-urgencia)',
  en_proceso: 'var(--color-accent-primary)',
  suspendido: 'var(--color-text-secondary)',
  resuelto: 'var(--color-success)',
};

/**
 * Puestos que tiene casi toda unidad, para que crear el primero sea tocar
 * un chip. Mismo criterio que las zonas sugeridas del mapa: lo que acorta
 * la carga inicial vale más que cualquier función que venga después.
 */
export const PUESTOS_SUGERIDOS: Array<{ name: string; icon: string }> = [
  { name: 'Portería', icon: 'shield' },
  { name: 'Aseo', icon: 'sparkles' },
  { name: 'Mantenimiento', icon: 'wrench' },
  { name: 'Jardinería', icon: 'sprout' },
  { name: 'Piscina', icon: 'waves' },
  { name: 'Administración', icon: 'briefcase' },
];

/**
 * El mensaje con el que se despacha una tarea por WhatsApp.
 *
 * Arranca con lo que hay que hacer y dónde, porque eso es lo que se lee en
 * la notificación sin abrir el chat. El enlace va al final: es lo que cierra
 * el ciclo, pero no es lo primero que necesita saber quien recibe.
 *
 * Sale del WhatsApp personal del administrador —`wa.me` no puede hacer otra
 * cosa— así que el texto no finge venir de un sistema.
 */
/**
 * El mensaje para un proveedor externo, que es otra cosa que el del puesto.
 *
 * El portero recibe una orden: es personal de la unidad y esto es su
 * trabajo. El plomero recibe una *solicitud*, y hasta que no cotice y
 * acepte no hay nada acordado. Mandarle a un tercero un mensaje redactado
 * como una orden de trabajo es una forma rápida de que no vuelva a
 * contestar.
 *
 * El texto sale casi literal de cómo lo describió el administrador:
 * "cotíceme, tengo esto y qué disponibilidad tiene".
 */
export function armarMensajeCotizacion({
  proveedor,
  titulo,
  lugar,
  comunidad,
  enlace,
}: {
  proveedor: string;
  titulo: string;
  lugar?: string | null;
  comunidad: string;
  enlace: string;
}): string {
  const donde = lugar?.trim() ? ` en ${lugar.trim()}` : '';
  return [
    `Hola ${proveedor}, buen día. Le escribo de la administración de ${comunidad}.`,
    '',
    `Necesitamos: ${titulo}${donde}.`,
    '',
    '¿Me puede cotizar y decir qué disponibilidad tiene?',
    '',
    `Acá está el detalle y ahí mismo puede responder: ${enlace}`,
  ].join('\n');
}

export function armarMensajeTarea({
  titulo,
  lugar,
  comunidad,
  enlace,
}: {
  titulo: string;
  lugar?: string | null;
  comunidad: string;
  enlace: string;
}): string {
  const donde = lugar?.trim() ? ` en ${lugar.trim()}` : '';
  return [
    `Hola, buen día. Pendiente de ${comunidad}: ${titulo}${donde}.`,
    '',
    `Podés ver el detalle y avisar cuando esté hecho acá: ${enlace}`,
  ].join('\n');
}
