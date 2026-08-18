-- ============================================================================
-- Convivencia: reportes de riesgo e incidentes de la comunidad.
--
-- Un reclamo suelto en el grupo de WhatsApp no le sirve a nadie. Ocho
-- reportes del mismo tipo y lugar, con fecha, son evidencia con la que la
-- administración puede actuar y demostrar que actuó.
-- ============================================================================

create schema if not exists convivencia;
--> statement-breakpoint

grant usage on schema convivencia to anon, authenticated, service_role;
--> statement-breakpoint
grant all on all tables in schema convivencia to service_role;
--> statement-breakpoint
grant all on all sequences in schema convivencia to service_role;
--> statement-breakpoint
grant select, insert, update, delete on all tables in schema convivencia to authenticated;
--> statement-breakpoint
grant usage, select on all sequences in schema convivencia to authenticated;
--> statement-breakpoint

create table if not exists convivencia.incident_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references core.tenants (id) on delete cascade,
  reported_by uuid references core.profiles (id) on delete set null,
  type text not null,
  location text,
  description text,
  photo_url text,
  status text not null default 'nuevo',
  resolution_note text,
  resolved_by uuid references core.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
--> statement-breakpoint

create index if not exists incident_reports_tenant_idx
  on convivencia.incident_reports (tenant_id, created_at);
--> statement-breakpoint
create index if not exists incident_reports_patron_idx
  on convivencia.incident_reports (tenant_id, type, location);
--> statement-breakpoint

-- Los grants de arriba solo alcanzan a las tablas que ya existían, así que
-- se repiten después de crearla.
grant select, insert, update, delete on convivencia.incident_reports to authenticated;
--> statement-breakpoint
grant all on convivencia.incident_reports to service_role;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- RLS
--
-- Un vecino ve lo suyo y nada más: si cada quien pudiera leer los reportes
-- del resto, volvemos al grupo de WhatsApp pero con fotos. La lectura
-- completa y el cambio de estado son de la administración.
-- ----------------------------------------------------------------------------

alter table convivencia.incident_reports enable row level security;
--> statement-breakpoint

drop policy if exists "members create reports" on convivencia.incident_reports;
--> statement-breakpoint
create policy "members create reports" on convivencia.incident_reports
  for insert
  to authenticated
  with check (
    tenant_id in (select core.user_tenants(auth.uid()))
    and reported_by = auth.uid()
  );
--> statement-breakpoint

drop policy if exists "members read own reports" on convivencia.incident_reports;
--> statement-breakpoint
create policy "members read own reports" on convivencia.incident_reports
  for select
  to authenticated
  using (
    reported_by = auth.uid()
    and tenant_id in (select core.user_tenants(auth.uid()))
  );
--> statement-breakpoint

drop policy if exists "admins read all reports" on convivencia.incident_reports;
--> statement-breakpoint
create policy "admins read all reports" on convivencia.incident_reports
  for select
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

drop policy if exists "admins update reports" on convivencia.incident_reports;
--> statement-breakpoint
create policy "admins update reports" on convivencia.incident_reports
  for update
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  )
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
