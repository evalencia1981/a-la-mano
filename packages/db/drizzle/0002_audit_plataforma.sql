-- ============================================================================
-- El audit log admite acciones de plataforma, sin comunidad.
--
-- Crear o editar una categoría global no pertenece a ningún tenant, pero
-- igual hay que poder rastrear quién lo hizo. La RLS existente filtra por
-- `tenant_id`, así que estas entradas quedan invisibles para los admins de
-- comunidad: `null in (...)` no matchea. Se leen con service_role.
-- ============================================================================

alter table core.audit_log alter column tenant_id drop not null;
