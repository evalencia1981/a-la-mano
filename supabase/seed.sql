-- ============================================================================
-- A la Mano — Seed inicial
--
-- Aplicar DESPUÉS de pnpm db:push + functions.sql + policies.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Categorías globales del directorio (26).
-- ----------------------------------------------------------------------------

insert into directory.categories (slug, name, group_name, display_order, icon_name) values
  ('plomeria', 'Plomería', 'Reparaciones y mantenimiento del hogar', 1, 'wrench'),
  ('electricidad', 'Electricidad', 'Reparaciones y mantenimiento del hogar', 2, 'zap'),
  ('gas-calentadores', 'Gas / instalación de calentadores', 'Reparaciones y mantenimiento del hogar', 3, 'flame'),
  ('cerrajeria', 'Cerrajería', 'Reparaciones y mantenimiento del hogar', 4, 'key'),
  ('pintura', 'Pintura', 'Reparaciones y mantenimiento del hogar', 5, 'paintbrush'),
  ('carpinteria', 'Carpintería', 'Reparaciones y mantenimiento del hogar', 6, 'hammer'),
  ('albanileria', 'Albañilería / construcción menor', 'Reparaciones y mantenimiento del hogar', 7, 'brick-wall'),
  ('electrodomesticos', 'Reparación de electrodomésticos', 'Reparaciones y mantenimiento del hogar', 8, 'washing-machine'),
  ('aire-acondicionado', 'Aire acondicionado y refrigeración', 'Reparaciones y mantenimiento del hogar', 9, 'air-vent'),
  ('vidrieria', 'Vidriería', 'Reparaciones y mantenimiento del hogar', 10, 'square'),
  ('limpieza-hogar', 'Limpieza de hogar', 'Limpieza y aseo', 11, 'sparkles'),
  ('limpieza-tapetes', 'Limpieza de tapetes y muebles', 'Limpieza y aseo', 12, 'sofa'),
  ('lavado-fachadas', 'Lavado de fachadas / vidrios externos', 'Limpieza y aseo', 13, 'building'),
  ('fumigacion', 'Fumigación / control de plagas', 'Limpieza y aseo', 14, 'bug'),
  ('jardineria', 'Jardinería', 'Exterior y jardín', 15, 'flower'),
  ('poda-arboles', 'Poda de árboles', 'Exterior y jardín', 16, 'trees'),
  ('piscinas', 'Mantenimiento de piscinas', 'Exterior y jardín', 17, 'waves'),
  ('ascensores', 'Mantenimiento de ascensores', 'Servicios para la comunidad / edificio', 18, 'arrow-up-down'),
  ('motobombas', 'Mantenimiento de motobombas', 'Servicios para la comunidad / edificio', 19, 'cog'),
  ('tanques-agua', 'Mantenimiento de tanques de agua', 'Servicios para la comunidad / edificio', 20, 'droplet'),
  ('vigilancia', 'Vigilancia / seguridad', 'Servicios para la comunidad / edificio', 21, 'shield'),
  ('admin-ph', 'Administración de propiedad horizontal', 'Servicios para la comunidad / edificio', 22, 'briefcase'),
  ('mudanzas', 'Mudanzas', 'Otros', 23, 'truck'),
  ('lavanderia', 'Lavandería a domicilio', 'Otros', 24, 'shirt'),
  ('plomeria-24h', 'Plomería 24h (urgencias)', 'Otros', 25, 'alarm-clock'),
  ('electricidad-24h', 'Electricidad 24h (urgencias)', 'Otros', 26, 'alarm-clock')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- Tenant demo (opcional). Después de signup, promovete a owner con SQL:
--
--   insert into core.tenant_members (tenant_id, user_id, role, status)
--   select t.id, '<tu-uuid>'::uuid, 'owner', 'active'
--   from core.tenants t where t.slug = 'demo'
--   on conflict do nothing;
--
-- Y para volverte Platform Admin:
--
--   update core.profiles set is_platform_admin = true where id = '<tu-uuid>'::uuid;
-- ----------------------------------------------------------------------------

insert into core.tenants (slug, name, type, primary_color, secondary_color)
values ('demo', 'Comunidad Demo', 'residential', '#3B82F6', '#1E40AF')
on conflict (slug) do nothing;
