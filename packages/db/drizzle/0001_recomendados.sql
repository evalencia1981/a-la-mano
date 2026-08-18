-- ============================================================================
-- Recomendación de proveedores entre comunidades cercanas.
--
-- Agrega:
--   1. Ubicación de la comunidad (`core.tenants`), que antes no existía.
--   2. Ubicación normalizada del proveedor, para poder cruzarla.
--   3. Reputación global del proveedor (promedio y cantidad a través de
--      todas las comunidades donde está, + en cuántas está).
--
-- La reputación global la mantiene el mismo trigger que ya mantenía el
-- promedio por comunidad. Ver `supabase/functions.sql`.
-- ============================================================================

alter table core.tenants add column if not exists city text;
--> statement-breakpoint
alter table core.tenants add column if not exists city_normalized text;
--> statement-breakpoint
alter table core.tenants add column if not exists sector text;
--> statement-breakpoint
alter table core.tenants add column if not exists sector_normalized text;
--> statement-breakpoint
create index if not exists tenants_ubicacion_idx
  on core.tenants (city_normalized, sector_normalized);
--> statement-breakpoint

alter table directory.providers add column if not exists city_normalized text;
--> statement-breakpoint
alter table directory.providers add column if not exists neighborhood_normalized text;
--> statement-breakpoint
alter table directory.providers
  add column if not exists global_rating_average numeric(3,2);
--> statement-breakpoint
alter table directory.providers
  add column if not exists global_rating_count integer not null default 0;
--> statement-breakpoint
alter table directory.providers
  add column if not exists community_count integer not null default 0;
--> statement-breakpoint
create index if not exists providers_recomendables_idx
  on directory.providers (city_normalized, global_rating_average);
