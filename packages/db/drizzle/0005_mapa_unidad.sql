-- ============================================================================
-- El mapa físico de la comunidad: torres, pisos y zonas comunes.
--
-- Sin esto, "torre 2", "Torre 2" y "T2" son tres lugares distintos para la
-- base, y la agrupación por patrón —que es la razón de ser de convivencia—
-- no agrupa nada. El administrador carga el mapa una vez; a partir de ahí
-- todo reporte se resuelve contra él.
--
-- Jerarquía de dos niveles y nada más: torre → piso, y zona suelta. Un árbol
-- más profundo se ve bien en el schema y es un infierno en un selector que
-- hay que usar caminando.
-- ============================================================================

create table if not exists convivencia.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references core.tenants (id) on delete cascade,
  parent_id uuid references convivencia.locations (id) on delete cascade,
  kind text not null,
  name text not null,
  normalized text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
--> statement-breakpoint

-- Un piso siempre cuelga de una torre; torres y zonas son siempre raíz.
-- Se valida también en el service, pero acá es donde no se puede evadir.
alter table convivencia.locations
  drop constraint if exists locations_jerarquia_check;
--> statement-breakpoint
alter table convivencia.locations
  add constraint locations_jerarquia_check check (
    (kind = 'piso' and parent_id is not null)
    or (kind in ('torre', 'zona') and parent_id is null)
  );
--> statement-breakpoint

create index if not exists locations_tenant_idx
  on convivencia.locations (tenant_id, kind, sort_order);
--> statement-breakpoint
create index if not exists locations_match_idx
  on convivencia.locations (tenant_id, normalized);
--> statement-breakpoint

-- Dos índices y no uno: en Postgres los NULL son distintos entre sí, así que
-- un unique plano sobre (tenant_id, parent_id, normalized) no dispararía
-- nunca para las raíces — que es justo donde más importa.
create unique index if not exists locations_unico_raiz_idx
  on convivencia.locations (tenant_id, normalized)
  where parent_id is null;
--> statement-breakpoint
create unique index if not exists locations_unico_hijo_idx
  on convivencia.locations (tenant_id, parent_id, normalized)
  where parent_id is not null;
--> statement-breakpoint

grant select, insert, update, delete on convivencia.locations to authenticated;
--> statement-breakpoint
grant all on convivencia.locations to service_role;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- RLS
--
-- Todo miembro lee el mapa: sin eso no puede elegir dónde pasó lo que está
-- reportando. Escribir es solo de la administración — si cualquiera pudiera
-- agregar lugares, en dos semanas hay cuatro variantes de "Torre 1" y
-- volvimos al texto libre por otro camino.
-- ----------------------------------------------------------------------------

alter table convivencia.locations enable row level security;
--> statement-breakpoint

drop policy if exists "members read locations" on convivencia.locations;
--> statement-breakpoint
create policy "members read locations" on convivencia.locations
  for select
  to authenticated
  using (tenant_id in (select core.user_tenants(auth.uid())));
--> statement-breakpoint

drop policy if exists "admins insert locations" on convivencia.locations;
--> statement-breakpoint
create policy "admins insert locations" on convivencia.locations
  for insert
  to authenticated
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

drop policy if exists "admins update locations" on convivencia.locations;
--> statement-breakpoint
create policy "admins update locations" on convivencia.locations
  for update
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  )
  with check (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

drop policy if exists "admins delete locations" on convivencia.locations;
--> statement-breakpoint
create policy "admins delete locations" on convivencia.locations
  for delete
  to authenticated
  using (
    tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
  );
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- Los reportes ahora apuntan al mapa.
--
-- `location` (texto) se queda: es lo que la persona escribió, y es lo único
-- que hay cuando el lugar todavía no está cargado. `set null` en la FK para
-- que dar de baja una zona no borre el historial que la menciona.
-- ----------------------------------------------------------------------------

alter table convivencia.incident_reports
  add column if not exists location_id uuid references convivencia.locations (id) on delete set null;
--> statement-breakpoint

create index if not exists incident_reports_patron_lugar_idx
  on convivencia.incident_reports (tenant_id, type, location_id);
