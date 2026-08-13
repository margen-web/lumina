-- MIGRACIÓN 002: Bloqueo explícito de privilegios de escritura en lumina_events

-- 1. Revocar de forma terminante privilegios de INSERT, UPDATE, DELETE a roles públicos
revoke insert, update, delete
on public.lumina_events
from anon, authenticated;

-- 2. Asegurar que RLS esté activo en la tabla
alter table public.lumina_events enable row level security;

-- 3. Eliminar cualquier política residual permisiva de inserción para roles cliente
drop policy if exists "Allow anon insert on lumina_events" on public.lumina_events;
drop policy if exists "Allow authenticated insert on lumina_events" on public.lumina_events;
drop policy if exists "Enable insert for authenticated users only" on public.lumina_events;
drop policy if exists "Enable insert for anon users" on public.lumina_events;

-- 4. El rol service_role (utilizado por el servidor en /api/events) conserva automáticamente
-- privilegios totales sin requerir policies permisivas abiertas a la web.
