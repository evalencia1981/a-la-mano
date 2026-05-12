-- ============================================================================
-- evalencia-stack — Row Level Security
--
-- PATRÓN ESTÁNDAR para toda tabla de feature que clones de este template:
--
--   alter table core.<tabla> enable row level security;
--   create policy "members read" on core.<tabla> for select
--     using (tenant_id in (select core.user_tenants(auth.uid())));
--   create policy "admins write" on core.<tabla> for all
--     using (tenant_id in (
--       select core.user_tenants_with_role(auth.uid(), array['owner','admin'])
--     ));
--
-- Toda tabla nueva debe tener RLS habilitada SI tiene `tenant_id`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tenants
-- ----------------------------------------------------------------------------
alter table core.tenants enable row level security;

drop policy if exists "members read own tenants" on core.tenants;
create policy "members read own tenants" on core.tenants
  for select
  to authenticated
  using (id in (select core.user_tenants(auth.uid())));

drop policy if exists "owners admins write tenant" on core.tenants;
create policy "owners admins write tenant" on core.tenants
  for update
  to authenticated
  using (id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])))
  with check (id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

drop policy if exists "owners delete tenant" on core.tenants;
create policy "owners delete tenant" on core.tenants
  for delete
  to authenticated
  using (id in (select core.user_tenants_with_role(auth.uid(), array['owner'])));

-- INSERT de tenants se hace desde `tenant.service.ts` con service_role
-- (porque al crearlo el user todavía no es member). RLS por lo tanto
-- no necesita policy de insert para clients normales.

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table core.profiles enable row level security;

drop policy if exists "users read own profile" on core.profiles;
create policy "users read own profile" on core.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "users read profiles of co-members" on core.profiles;
create policy "users read profiles of co-members" on core.profiles
  for select
  to authenticated
  using (id in (
    select user_id from core.tenant_members
    where tenant_id in (select core.user_tenants(auth.uid()))
  ));

drop policy if exists "users update own profile" on core.profiles;
create policy "users update own profile" on core.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- tenant_members
-- ----------------------------------------------------------------------------
alter table core.tenant_members enable row level security;

drop policy if exists "members read their memberships" on core.tenant_members;
create policy "members read their memberships" on core.tenant_members
  for select
  to authenticated
  using (tenant_id in (select core.user_tenants(auth.uid())));

drop policy if exists "admins write memberships" on core.tenant_members;
create policy "admins write memberships" on core.tenant_members
  for all
  to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])))
  with check (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

-- ----------------------------------------------------------------------------
-- tenant_invitations
-- ----------------------------------------------------------------------------
alter table core.tenant_invitations enable row level security;

drop policy if exists "admins manage invitations" on core.tenant_invitations;
create policy "admins manage invitations" on core.tenant_invitations
  for all
  to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])))
  with check (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

-- ----------------------------------------------------------------------------
-- audit_log
-- ----------------------------------------------------------------------------
alter table core.audit_log enable row level security;

drop policy if exists "admins read audit" on core.audit_log;
create policy "admins read audit" on core.audit_log
  for select
  to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

-- Las inserciones de audit pasan por `audit.service.ts` usando service_role
-- (bypassea RLS) — no se expone una policy de insert al rol authenticated.
