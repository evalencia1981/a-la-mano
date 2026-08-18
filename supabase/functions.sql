-- ============================================================================
-- A la Mano — Helpers de DB y triggers
--
-- Aplicar UNA vez, después de correr `pnpm db:push` que crea las tablas.
-- Orden de ejecución sugerido:
--   1. pnpm db:push           (crea schemas "core" + "directory" + tablas)
--   2. supabase/functions.sql (este archivo: helpers + triggers)
--   3. supabase/policies.sql  (RLS)
--   4. supabase/storage.sql   (bucket de fotos)
--   5. supabase/seed.sql      (categorías iniciales)
-- ============================================================================

-- Aseguramos que los schemas existan (Drizzle ya los crea, pero es idempotente).
create schema if not exists core;
create schema if not exists directory;

-- Grants schema core (template).
grant usage on schema core to anon, authenticated, service_role;
grant all on all tables in schema core to service_role;
grant all on all sequences in schema core to service_role;
grant select, insert, update, delete on all tables in schema core to authenticated;
grant usage, select on all sequences in schema core to authenticated;

-- Grants schema directory (A la Mano).
grant usage on schema directory to anon, authenticated, service_role;
grant all on all tables in schema directory to service_role;
grant all on all sequences in schema directory to service_role;
grant select, insert, update, delete on all tables in schema directory to authenticated;
grant usage, select on all sequences in schema directory to authenticated;

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

-- ============================================================================
-- A la Mano — helpers y triggers específicos del directorio
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: detectar Platform Admin desde policies RLS.
-- ----------------------------------------------------------------------------

create or replace function core.is_platform_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select coalesce(
    (select is_platform_admin from core.profiles where id = uid),
    false
  );
$$;

grant execute on function core.is_platform_admin(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Normalización de texto para comparar ubicaciones.
--
-- "Medellín", "medellin" y "MEDELLIN " son el mismo lugar. Esta función deja
-- los tres en "medellin". Se usa para cruzar la ciudad/sector de una
-- comunidad con la de un proveedor.
--
-- Replica `normalizarUbicacion` de `apps/web/src/lib/geo.ts`. Si cambia una,
-- cambia la otra. No usamos `unaccent` para no depender de una extensión.
-- ----------------------------------------------------------------------------

create or replace function core.normalizar_texto(valor text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        translate(
          lower(valor),
          'áàäâãéèëêíìïîóòöôõúùüûñç',
          'aaaaaeeeeiiiiooooouuuunc'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- Mantiene sincronizadas las columnas normalizadas de la comunidad.
create or replace function core.tenant_normalizar_ubicacion()
returns trigger
language plpgsql
as $$
begin
  NEW.city_normalized := core.normalizar_texto(NEW.city);
  NEW.sector_normalized := core.normalizar_texto(NEW.sector);
  return NEW;
end;
$$;

drop trigger if exists trg_tenant_normalizar_ubicacion on core.tenants;
create trigger trg_tenant_normalizar_ubicacion
  before insert or update of city, sector on core.tenants
  for each row execute function core.tenant_normalizar_ubicacion();

-- Ídem para el proveedor.
create or replace function directory.provider_normalizar_ubicacion()
returns trigger
language plpgsql
as $$
begin
  NEW.city_normalized := core.normalizar_texto(NEW.city);
  NEW.neighborhood_normalized := core.normalizar_texto(NEW.neighborhood);
  return NEW;
end;
$$;

drop trigger if exists trg_provider_normalizar_ubicacion on directory.providers;
create trigger trg_provider_normalizar_ubicacion
  before insert or update of city, neighborhood on directory.providers
  for each row execute function directory.provider_normalizar_ubicacion();

-- ----------------------------------------------------------------------------
-- Trigger: mantener rating_average + rating_count denormalizado en
-- directory.community_providers al insertar/actualizar/borrar ratings.
--
-- IMPORTANTE: esta es la ÚNICA fuente de verdad del rating denormalizado.
-- Nunca actualizar `rating_average` o `rating_count` manualmente desde código.
-- ----------------------------------------------------------------------------

create or replace function directory.update_community_provider_rating()
returns trigger
language plpgsql
security definer
set search_path = directory, pg_temp
as $$
declare
  cp_id uuid;
  prov_id uuid;
  new_avg numeric(3,2);
  new_count integer;
begin
  if (TG_OP = 'DELETE') then
    cp_id := OLD.community_provider_id;
  else
    cp_id := NEW.community_provider_id;
  end if;

  -- 1. Promedio dentro de la comunidad.
  --
  -- Sin calificaciones el promedio queda en NULL, no en 0: "todavía nadie
  -- lo calificó" no es lo mismo que "lo calificaron pésimo". Con 0 el
  -- proveedor aparecía al fondo del directorio, por debajo de uno con dos
  -- estrellas, como si fuera el peor de todos.
  select
    round(avg(stars)::numeric, 2),
    count(*)
  into new_avg, new_count
  from directory.ratings
  where community_provider_id = cp_id
    and is_hidden = false;

  update directory.community_providers
  set
    rating_average = new_avg,
    rating_count = new_count,
    updated_at = now()
  where id = cp_id
  returning provider_id into prov_id;

  -- 2. Reputación global del proveedor, sumando todas las comunidades donde
  --    está. Es la que habilita recomendarlo a unidades vecinas: 4.7 en
  --    cuatro unidades pesa más que 5.0 en una sola.
  perform directory.refrescar_reputacion_global(prov_id);

  if (TG_OP = 'DELETE') then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Reputación global de un proveedor: promedio y cantidad de calificaciones a
-- través de todas las comunidades, y en cuántas está activo.
--
-- Vive aparte porque la llaman dos triggers (calificaciones y altas/bajas de
-- community_providers) y el backfill.
-- ----------------------------------------------------------------------------

create or replace function directory.refrescar_reputacion_global(prov_id uuid)
returns void
language plpgsql
security definer
set search_path = directory, pg_temp
as $$
begin
  if prov_id is null then
    return;
  end if;

  update directory.providers p
  set
    global_rating_average = sub.promedio,
    global_rating_count = sub.cantidad,
    community_count = sub.comunidades,
    updated_at = now()
  from (
    select
      round(avg(r.stars)::numeric, 2) as promedio,
      count(r.id) as cantidad,
      (
        select count(*)
        from directory.community_providers cp2
        where cp2.provider_id = prov_id and cp2.is_active = true
      ) as comunidades
    from directory.community_providers cp
    left join directory.ratings r
      on r.community_provider_id = cp.id and r.is_hidden = false
    where cp.provider_id = prov_id and cp.is_active = true
  ) as sub
  where p.id = prov_id;
end;
$$;

-- Alta, baja o desactivación de un proveedor en una comunidad también mueve
-- su reputación global (cambia en cuántas comunidades está, y qué
-- calificaciones cuentan).
create or replace function directory.community_provider_reputacion_trigger()
returns trigger
language plpgsql
security definer
set search_path = directory, pg_temp
as $$
begin
  if (TG_OP = 'DELETE') then
    perform directory.refrescar_reputacion_global(OLD.provider_id);
    return OLD;
  end if;

  perform directory.refrescar_reputacion_global(NEW.provider_id);
  if (TG_OP = 'UPDATE' and OLD.provider_id is distinct from NEW.provider_id) then
    perform directory.refrescar_reputacion_global(OLD.provider_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_cp_reputacion on directory.community_providers;
create trigger trg_cp_reputacion
  after insert or update of is_active, provider_id or delete
  on directory.community_providers
  for each row execute function directory.community_provider_reputacion_trigger();

drop trigger if exists trg_update_rating on directory.ratings;
create trigger trg_update_rating
  after insert or update or delete on directory.ratings
  for each row execute function directory.update_community_provider_rating();

-- ----------------------------------------------------------------------------
-- Trigger: mantener updated_at en tablas del directorio que lo tienen.
-- ----------------------------------------------------------------------------

drop trigger if exists providers_set_updated_at on directory.providers;
create trigger providers_set_updated_at
  before update on directory.providers
  for each row execute function core.set_updated_at();

drop trigger if exists categories_set_updated_at on directory.categories;
create trigger categories_set_updated_at
  before update on directory.categories
  for each row execute function core.set_updated_at();

drop trigger if exists community_providers_set_updated_at on directory.community_providers;
create trigger community_providers_set_updated_at
  before update on directory.community_providers
  for each row execute function core.set_updated_at();

drop trigger if exists ratings_set_updated_at on directory.ratings;
create trigger ratings_set_updated_at
  before update on directory.ratings
  for each row execute function core.set_updated_at();

drop trigger if exists suggestions_set_updated_at on directory.suggestions;
create trigger suggestions_set_updated_at
  before update on directory.suggestions
  for each row execute function core.set_updated_at();

-- ----------------------------------------------------------------------------
-- Vista: ratings con badge de estado del miembro (active / inactive).
-- Las pantallas del provider la usan para mostrar el badge "Ex-miembro".
-- ----------------------------------------------------------------------------

create or replace view directory.ratings_with_member_status as
select
  r.*,
  tm.status as member_status,
  case
    when tm.status = 'inactive' then true
    else false
  end as is_ex_member
from directory.ratings r
inner join core.tenant_members tm
  on tm.user_id = r.user_id and tm.tenant_id = r.tenant_id;

grant select on directory.ratings_with_member_status to authenticated;
