import { notFound } from 'next/navigation';
import { ClipboardList, MapPin } from 'lucide-react';
import { taskService } from '@/server/services/task.service';
import { ESTADOS_TAREA, type EstadoTarea } from '@/lib/task-types';
import { AccionesTarea } from './acciones-tarea';

export const metadata = { title: 'Pendiente' };

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * La tarea vista por quien la tiene que hacer.
 *
 * Es una página pública: quien la abre no tiene cuenta y no la va a crear.
 * El portero y el del aseo no se registran en aplicaciones — si para marcar
 * "listo" hubiera que instalar algo o inventar una contraseña, nadie marca
 * nada y el ciclo queda abierto para siempre.
 *
 * La autorización es el token de la URL, y abre esta tarea y nada más: no da
 * acceso a la comunidad, ni al resto de los pendientes, ni al directorio.
 * Caduca a los 30 días y la administración lo puede revocar.
 *
 * Que esta página exista es lo que WhatsApp estructuralmente no puede hacer.
 * El mensaje sale del WhatsApp personal del administrador y la respuesta le
 * llega a su chat; el sistema nunca se entera. El enlace sí vuelve.
 */
export default async function TareaPorEnlacePage({ params }: Props) {
  const { token } = await params;
  const vista = await taskService.verPorToken(token);
  if (!vista) notFound();

  const estado = (vista.tarea.status in ESTADOS_TAREA
    ? vista.tarea.status
    : 'pendiente') as EstadoTarea;

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-8">
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {vista.comunidad} · para {vista.destinatario}
          </p>
          <h1 className="flex items-start gap-2 font-display text-2xl font-bold tracking-tight">
            <ClipboardList
              className="mt-1 h-6 w-6 shrink-0 text-[var(--color-text-secondary)]"
              aria-hidden
            />
            {vista.tarea.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-secondary)]">
            <span>{ESTADOS_TAREA[estado]}</span>
            {vista.tarea.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {vista.tarea.location}
              </span>
            )}
            <span>
              {vista.tarea.createdAt.toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>
        </header>

        {vista.tarea.description && (
          <p className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-[15px]">
            {vista.tarea.description}
          </p>
        )}

        {vista.editable ? (
          <AccionesTarea token={token} estadoActual={estado} />
        ) : (
          <p className="rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            {vista.motivoBloqueo}
          </p>
        )}

        {vista.bitacora.length > 0 && (
          <section className="space-y-2 border-t border-[var(--color-border)] pt-5">
            <h2 className="font-display text-base font-semibold">Qué pasó hasta ahora</h2>
            <ul className="space-y-2">
              {vista.bitacora.map((m) => (
                <li key={m.id} className="text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    {m.createdAt.toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    {m.authorLabel ?? 'Administración'}
                  </span>
                  <br />
                  {m.status ? ESTADOS_TAREA[m.status as EstadoTarea] ?? m.status : 'Nota'}
                  {m.note && `: ${m.note}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Este enlace abre solo este pendiente.
        </p>
      </div>
    </main>
  );
}
