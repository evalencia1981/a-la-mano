-- ============================================================================
-- evalencia-stack — Seed mínimo
--
-- Crea un tenant demo. NO crea usuarios — registrate primero en /signup,
-- después corré el `insert into core.tenant_members` de abajo reemplazando
-- el UUID por el de tu user.
-- ============================================================================

insert into core.tenants (slug, name, primary_color, secondary_color)
values ('demo', 'Demo Organization', '#3B82F6', '#1E40AF')
on conflict (slug) do nothing;

-- Después de hacer signup en /signup, encontrá tu user id con:
--   select id, email from auth.users order by created_at desc limit 5;
--
-- Y promoveté a owner del tenant demo:
--
--   insert into core.tenant_members (tenant_id, user_id, role)
--   select t.id, '<tu-uuid>'::uuid, 'owner'
--   from core.tenants t where t.slug = 'demo'
--   on conflict do nothing;
