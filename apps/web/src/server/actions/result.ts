/**
 * Tipo de retorno estándar de Server Actions. Devuelve un discriminated
 * union — más limpio que tirar errores y atraparlos en el client.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: unknown): ActionResult<never> {
  const message = error instanceof Error ? error.message : 'Algo salió mal.';
  return { ok: false, error: message };
}
