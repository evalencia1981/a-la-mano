-- ============================================================================
-- evalencia-stack — Helpers de DB y triggers
--
-- Aplicar UNA vez, después de correr `pnpm db:push` que crea las tablas.
-- Orden de ejecución sugerido:
--   1. pnpm db:push          (crea schema "core" + tablas)
--   2. supabase/functions.sql (este archivo)
--   3. supabase/policies.sql  (RLS)
--   4. supabase/seed.sql      (opcional)
-- ============================================================================

-- Aseguramos que el schema exista (Drizzle ya lo crea, pero es idempotente).
create schema if not exists core;
grant usage on schema core to anon, authenticated, service_role;
grant all on all tables in schema core to service_role;
grant all on all sequences in schema core to service_role;
grant select, insert, update, delete on all tables in schema core to authenticated;
grant usage, select on all sequences in schema core to authenticated;

-- ----------------------------------------------------------------------------
-- Helpers RLS — devuelven los tenants visibles para un user.
-- Marcados `security definer` para poder consultarse desde policies sin
-- riesgo de recursión infinita.
-- ----------------------------------------------------------------------------

create or replace function core.user_tenants(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select tenant_id from core.tenant_members where user_id = uid;
$$;

create or replace function core.user_tenants_with_role(uid uuid, roles text[])
returns setof uuid
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select tenant_id from core.tenant_members
  where user_id = uid and role = any(roles);
$$;

grant execute on function core.user_tenants(uuid) to authenticated;
grant execute on function core.user_tenants_with_role(uuid, text[]) to authenticated;

-- ----------------------------------------------------------------------------
-- Trigger: al registrarse un user en Supabase Auth, crear su `profile`.
-- ----------------------------------------------------------------------------

create or replace function core.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = core, pg_temp
as $$
begin
  insert into core.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function core.handle_new_user();

-- ----------------------------------------------------------------------------
-- Trigger: mantener `updated_at` en `tenants` al hacer update.
-- ----------------------------------------------------------------------------

create or replace function core.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenants_set_updated_at on core.tenants;
create trigger tenants_set_updated_at
  before update on core.tenants
  for each row execute function core.set_updated_at();
