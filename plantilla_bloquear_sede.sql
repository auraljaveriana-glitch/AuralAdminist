-- ============================================================
-- AURAL · Plantilla: bloquear una sede completa por un rango de fechas
-- (ej. cierre por remodelación, vacaciones colectivas, etc.)
--
-- Esto crea un bloqueo de DÍA COMPLETO para cada audiólogo de la sede,
-- para cada día del rango. Ni el panel de admin (si luego lo validamos
-- ahí) ni la página pública van a mostrar espacios disponibles esos días.
--
-- CÓMO USARLA: cambia los 3 valores marcados con 👉 y corre en el
-- SQL Editor de Supabase.
-- ============================================================

insert into bloqueos (audiologo_id, fecha, motivo)
select
  a.id,
  dia::date,
  'Cierre temporal de sede'                          -- 👉 cambia el motivo si quieres
from audiologos a
join sedes s on s.id = a.sede_id,
  generate_series(
    '2026-08-15'::date,                               -- 👉 fecha de inicio (incluida)
    '2026-08-20'::date,                                -- 👉 fecha final (incluida)
    interval '1 day'
  ) as dia
where s.nombre = 'Aural Usaquén';                      -- 👉 nombre exacto de la sede

-- Repite el mismo bloque cambiando el nombre de la sede para Javeriana:

insert into bloqueos (audiologo_id, fecha, motivo)
select
  a.id,
  dia::date,
  'Cierre temporal de sede'
from audiologos a
join sedes s on s.id = a.sede_id,
  generate_series(
    '2026-08-15'::date,
    '2026-08-20'::date,
    interval '1 day'
  ) as dia
where s.nombre = 'Aural Javeriana';

-- ============================================================
-- Verificación: revisa que quedaron los bloqueos correctos
-- ============================================================
select s.nombre as sede, a.nombre as audiologo, b.fecha, b.motivo
from bloqueos b
join audiologos a on a.id = b.audiologo_id
join sedes s on s.id = a.sede_id
order by b.fecha, s.nombre, a.nombre;

-- ============================================================
-- Para DESBLOQUEAR (quitar el cierre) más adelante, usa esto:
-- ============================================================
-- delete from bloqueos
-- where fecha between '2026-08-15' and '2026-08-20'
--   and motivo = 'Cierre temporal de sede'
--   and audiologo_id in (
--     select a.id from audiologos a join sedes s on s.id = a.sede_id
--     where s.nombre in ('Aural Usaquén', 'Aural Javeriana')
--   );
