-- ============================================================================
-- Despacho de un pendiente a un proveedor externo del directorio.
--
-- Cierra el círculo del producto: el vecino alimenta el directorio con
-- reportes y calificaciones, el administrador saca de ahí a quién llamar, y
-- el proveedor recibe trabajo con la calificación de la comunidad detrás.
-- Ninguna de las tres piezas vale por separado lo que valen juntas.
--
-- Un pendiente se despacha a UN puesto o a UN proveedor, nunca a los dos:
-- portería y el plomero no son la misma clase de destinatario. El puesto es
-- personal de la unidad y recibe una orden; el proveedor es externo y recibe
-- una solicitud de cotización.
-- ============================================================================

alter table convivencia.tasks
  add column if not exists community_provider_id uuid
  references directory.community_providers (id) on delete set null;
--> statement-breakpoint

alter table convivencia.task_dispatches
  add column if not exists community_provider_id uuid
  references directory.community_providers (id) on delete set null;
--> statement-breakpoint

-- A lo sumo uno de los dos. Se valida en el service, pero acá es donde no
-- se puede evadir por ningún camino.
alter table convivencia.tasks
  drop constraint if exists tasks_destinatario_check;
--> statement-breakpoint
alter table convivencia.tasks
  add constraint tasks_destinatario_check check (
    position_id is null or community_provider_id is null
  );
--> statement-breakpoint

create index if not exists tasks_proveedor_idx
  on convivencia.tasks (tenant_id, community_provider_id, status);
