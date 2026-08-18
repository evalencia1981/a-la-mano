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

-- ============================================================================
-- A la Mano — schema `directory`
-- ============================================================================

-- ----------------------------------------------------------------------------
-- directory.categories — lectura abierta para auth, escritura Platform Admin
-- ----------------------------------------------------------------------------
alter table directory.categories enable row level security;

drop policy if exists "auth read categories" on directory.categories;
create policy "auth read categories" on directory.categories
  for select to authenticated
  using (true);

drop policy if exists "platform admin manages categories" on directory.categories;
create policy "platform admin manages categories" on directory.categories
  for all to authenticated
  using (core.is_platform_admin(auth.uid()))
  with check (core.is_platform_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- directory.providers — entidad global, cualquier auth puede leer/escribir
-- (la lógica de duplicados por phoneNormalized vive en el service).
-- ----------------------------------------------------------------------------
alter table directory.providers enable row level security;

drop policy if exists "auth read providers" on directory.providers;
create policy "auth read providers" on directory.providers
  for select to authenticated
  using (true);

drop policy if exists "authenticated can insert providers" on directory.providers;
create policy "authenticated can insert providers" on directory.providers
  for insert to authenticated
  with check (true);

drop policy if exists "authenticated can update providers" on directory.providers;
create policy "authenticated can update providers" on directory.providers
  for update to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- directory.provider_photos — lectura abierta para auth, escritura auth
-- (la regla "máx 6 fotos" vive en el service, no en RLS).
-- ----------------------------------------------------------------------------
alter table directory.provider_photos enable row level security;

drop policy if exists "auth read provider photos" on directory.provider_photos;
create policy "auth read provider photos" on directory.provider_photos
  for select to authenticated
  using (true);

drop policy if exists "authenticated can manage photos" on directory.provider_photos;
create policy "authenticated can manage photos" on directory.provider_photos
  for all to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- directory.community_providers — multi-tenant estricta
-- ----------------------------------------------------------------------------
alter table directory.community_providers enable row level security;

drop policy if exists "members read active community providers" on directory.community_providers;
create policy "members read active community providers" on directory.community_providers
  for select to authenticated
  using (
    tenant_id in (select core.user_tenants(auth.uid()))
    and (
      is_active = true
      or tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin']))
    )
  );

drop policy if exists "admins write community providers" on directory.community_providers;
create policy "admins write community providers" on directory.community_providers
  for all to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])))
  with check (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

-- ----------------------------------------------------------------------------
-- directory.ratings
-- ----------------------------------------------------------------------------
alter table directory.ratings enable row level security;

drop policy if exists "members read tenant ratings" on directory.ratings;
create policy "members read tenant ratings" on directory.ratings
  for select to authenticated
  using (tenant_id in (select core.user_tenants(auth.uid())));

drop policy if exists "members create own rating" on directory.ratings;
create policy "members create own rating" on directory.ratings
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id in (select core.user_tenants(auth.uid()))
  );

drop policy if exists "members update own rating" on directory.ratings;
create policy "members update own rating" on directory.ratings
  for update to authenticated
  using (
    user_id = auth.uid()
    and tenant_id in (select core.user_tenants(auth.uid()))
  );

drop policy if exists "admins manage tenant ratings" on directory.ratings;
create policy "admins manage tenant ratings" on directory.ratings
  for update to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])))
  with check (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

-- ----------------------------------------------------------------------------
-- directory.suggestions
-- ----------------------------------------------------------------------------
alter table directory.suggestions enable row level security;

drop policy if exists "members create suggestions" on directory.suggestions;
create policy "members create suggestions" on directory.suggestions
  for insert to authenticated
  with check (
    suggested_by = auth.uid()
    and tenant_id in (select core.user_tenants(auth.uid()))
  );

drop policy if exists "members read own suggestions" on directory.suggestions;
create policy "members read own suggestions" on directory.suggestions
  for select to authenticated
  using (suggested_by = auth.uid());

drop policy if exists "admins read tenant suggestions" on directory.suggestions;
create policy "admins read tenant suggestions" on directory.suggestions
  for select to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));

drop policy if exists "admins update suggestions" on directory.suggestions;
create policy "admins update suggestions" on directory.suggestions
  for update to authenticated
  using (tenant_id in (select core.user_tenants_with_role(auth.uid(), array['owner','admin'])));
