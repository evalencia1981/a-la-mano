-- ============================================================================
-- Pendientes del administrador, puestos de trabajo y despacho por enlace.
--
-- El administrador camina la unidad y encuentra cosas. Hoy las mete en un
-- audio de WhatsApp porque capturar es instantáneo, y después se le pierden.
-- Tuvo un Excel con estados y seguimiento, y lo abandonó igual: el Excel
-- resolvía bien todo menos lo único que importa, que es cuánto cuesta meter
-- un pendiente.
--
-- Dos decisiones que atraviesan todo el archivo:
--
--  - Una tarea se asigna al PUESTO, nunca a la persona. El portero rota por
--    turnos; asignada a quien salió a las dos de la tarde, no la atiende
--    nadie.
--  - Una tarea se puede guardar sin puesto y sin lugar. Un pendiente
--    incompleto sirve; uno que la app se negó a recibir, no.
-- ============================================================================

create table if not exists convivencia.positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references core.tenants (id) on delete cascade,
  name text not null,
  normalized text not null,
  phone text,
  phone_normalized text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
--> statement-breakpoint

create index if not exists positions_tenant_idx
  on convivencia.positions (tenant_id, sort_order);
--> statement-breakpoint
create unique index if not exists positions_unico_idx
  on convivencia.positions (tenant_id, normalized);
--> statement-breakpoint

create table if not exists convivencia.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references core.tenants (id) on delete cascade,
  created_by uuid references core.profiles (id) on delete set null,
  title text not null,
  description text,
  location_id uuid references convivencia.locations (id) on delete set null,
  location text,
  position_id uuid references convivencia.positions (id) on delete set null,
  status text not null default 'pendiente',
  photo_url text,
  resolved_at timestamptz,
  resolved_by uuid references core.profiles (id),
  created_at timestamptz not null default now()
);
--> statement-breakpoint

create index if not exists tasks_bandeja_idx
  on convivencia.tasks (tenant_id, status, created_at);
--> statement-breakpoint
create index if not exists tasks_puesto_idx
  on convivencia.tasks (tenant_id, position_id, status);
--> statement-breakpoint
create index if not exists tasks_fecha_idx
  on convivencia.tasks (tenant_id, created_at);
--> statement-breakpoint

-- Bitácora. Responde "si no lo atendieron, ¿por qué?", que es la pregunta
-- que él repitió tres veces. El estado dice dónde está; esto dice qué pasó.
create table if not exists convivencia.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references convivencia.tasks (id) on delete cascade,
  tenant_id uuid not null references core.tenants (id) on delete cascade,
  status text,
  note text,
  author_id uuid references core.profiles (id) on delete set null,
  author_label text,
  created_at timestamptz not null default now()
);
--> statement-breakpoint

create index if not exists task_updates_tarea_idx
  on convivencia.task_updates (task_id, created_at);
--> statement-breakpoint

-- Despachos. El enlace es lo que cierra el ciclo: `wa.me` manda el mensaje
-- desde el WhatsApp personal del administrador, así que la respuesta del
-- otro nunca vuelve al sistema. El token sí vuelve.
create table if not exists convivencia.task_dispatches (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references convivencia.tasks (id) on delete cascade,
  tenant_id uuid not null references core.tenants (id) on delete cascade,
  position_id uuid references convivencia.positions (id) on delete set null,
  recipient_label text not null,
  phone text,
  token text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
--> statement-breakpoint

-- Unique: un token tiene que resolver a un despacho y a uno solo.
create unique index if not exists task_dispatches_token_idx
  on convivencia.task_dispatches (token);
--> statement-breakpoint
create index if not exists task_dispatches_tarea_idx
  on convivencia.task_dispatches (task_id, created_at);
--> statement-breakpoint

grant select, insert, update, delete on convivencia.positions to authenticated;
--> statement-breakpoint
grant select, insert, update, delete on convivencia.tasks to authenticated;
--> statement-breakpoint
grant select, insert, update, delete on convivencia.task_updates to authenticated;
--> statement-breakpoint
grant select, insert, update, delete on convivencia.task_dispatches to authenticated;
--> statement-breakpoint
grant all on convivencia.positions to service_role;
--> statement-breakpoint
grant all on convivencia.tasks to service_role;
--> statement-breakpoint
grant all on convivencia.task_updates to service_role;
--> statement-breakpoint
grant all on convivencia.task_dispatches to service_role;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- RLS
--
-- Todo esto es de la administración y de nadie más. Un vecino no tiene por
-- qué ver la lista de pendientes internos de la unidad, ni quién los
-- atendió: son datos de gestión, no del directorio ni de convivencia.
--
-- El puesto y el proveedor no aparecen acá porque no tienen cuenta: entran
-- por el token del despacho, que se valida server-side contra
-- `task_dispatches` antes de mostrar nada. Ver `/tarea/[token]`.
-- ----------------------------------------------------------------------------

alter table convivencia.positions enable row level security;
--> statement-breakpoint
alter table convivencia.tasks enable row level security;
--> statement-breakpoint
alter table convivencia.task_updates enable row level security;
--> statement-breakpoint
alter table convivencia.task_dispatches enable row level security;
--> statement-breakpoint

drop policy if exists "admins manage positions" on convivencia.positions;
--> statement-breakpoint
create policy "admins manage positions" on convivencia.positions
  for all
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  )
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

drop policy if exists "admins manage tasks" on convivencia.tasks;
--> statement-breakpoint
create policy "admins manage tasks" on convivencia.tasks
  for all
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  )
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

drop policy if exists "admins manage task updates" on convivencia.task_updates;
--> statement-breakpoint
create policy "admins manage task updates" on convivencia.task_updates
  for all
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  )
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

drop policy if exists "admins manage task dispatches" on convivencia.task_dispatches;
--> statement-breakpoint
create policy "admins manage task dispatches" on convivencia.task_dispatches
  for all
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  )
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
