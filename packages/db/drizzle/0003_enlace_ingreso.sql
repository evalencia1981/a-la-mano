-- ============================================================================
-- Enlace de ingreso por comunidad.
--
-- Reemplaza, para el caso masivo, la invitación de a un correo por vez: el
-- administrador comparte un enlace en el grupo de WhatsApp del edificio y
-- cada residente entra iniciando sesión con Google.
--
-- El código se genera para las comunidades que ya existen. `gen_random_uuid`
-- viene con pgcrypto, que Supabase habilita por defecto.
-- ============================================================================

alter table core.tenants add column if not exists join_code text;
--> statement-breakpoint
alter table core.tenants
  add column if not exists join_code_enabled boolean not null default true;
--> statement-breakpoint

-- Código corto y sin caracteres ambiguos (nada de O/0 ni I/1), derivado del
-- uuid para que sea distinto en cada comunidad.
update core.tenants
set join_code = upper(
  translate(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8), 'oil', 'xyz')
)
where join_code is null;
--> statement-breakpoint

create unique index if not exists tenants_join_code_idx on core.tenants (join_code);
