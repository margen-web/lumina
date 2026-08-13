-- MIGRACIÓN 001: Deduplicación Atómica de edition_completed y Blindaje RLS de lumina_events

-- 1. Limpieza de posibles duplicados históricos antes de aplicar la restricción
delete from public.lumina_events a
using public.lumina_events b
where a.id < b.id
  and a.event_name = 'edition_completed'
  and b.event_name = 'edition_completed'
  and a.device_uuid = b.device_uuid
  and a.edition_date = b.edition_date;

-- 2. Índice Único Parcial para garantizar ATOMICIDAD en PostgreSQL
-- Máximo 1 evento 'edition_completed' por device_uuid y edition_date
create unique index if not exists idx_lumina_events_edition_completed_unique
on public.lumina_events (device_uuid, edition_date)
where event_name = 'edition_completed';

-- 3. Blindaje RLS en lumina_events:
-- Bloquear inserts directos desde el cliente (anon/authenticated).
-- Todas las escrituras deben realizarse exclusivamente a través del backend (/api/events) con service_role.

alter table if exists public.lumina_events enable row level security;

-- Eliminar policies anteriores permisivas si existen
drop policy if exists "Allow anon insert on lumina_events" on public.lumina_events;
drop policy if exists "Allow authenticated insert on lumina_events" on public.lumina_events;
drop policy if exists "Service role full access on lumina_events" on public.lumina_events;

-- Política estricta: Solo administradores pueden consultar eventos
create policy "Allow admins to select lumina_events"
on public.lumina_events
for select
to authenticated
using (public.is_lumina_admin(auth.uid()));

-- Service role conserva acceso total automáticamente para inserciones desde /api/events
