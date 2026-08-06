-- ============================================================
-- AURAL · Cerrar Usaquén y Javeriana TODO agosto 2026 (1 al 31)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Limpia cualquier bloqueo suelto que hayas creado antes para
-- estas dos sedes en agosto, para no dejar filas duplicadas
delete from bloqueos
where fecha between '2026-08-01' and '2026-08-31'
  and audiologo_id in (
    select a.id from audiologos a join sedes s on s.id = a.sede_id
    where s.nombre in ('Aural Usaquén', 'Aural Javeriana')
  );

-- 2. Crea el bloqueo de día completo para cada audiólogo de ambas
-- sedes, para cada uno de los 31 días de agosto
insert into bloqueos (audiologo_id, fecha, motivo)
select
  a.id,
  dia::date,
  'Cierre temporal de sede - agosto 2026'
from audiologos a
join sedes s on s.id = a.sede_id,
  generate_series('2026-08-01'::date, '2026-08-31'::date, interval '1 day') as dia
where s.nombre in ('Aural Usaquén', 'Aural Javeriana');

-- ============================================================
-- Verificación: deberías ver 31 fechas por cada audiólogo de
-- estas dos sedes (17 audiólogos en total entre las dos... espera,
-- son 4 de Usaquén + 3 de Javeriana = 7 audiólogos × 31 días = 217 filas)
-- ============================================================
select count(*) as total_bloqueos
from bloqueos
where fecha between '2026-08-01' and '2026-08-31'
  and motivo = 'Cierre temporal de sede - agosto 2026';

select s.nombre as sede, a.nombre as audiologo, count(b.id) as dias_bloqueados
from bloqueos b
join audiologos a on a.id = b.audiologo_id
join sedes s on s.id = a.sede_id
where b.motivo = 'Cierre temporal de sede - agosto 2026'
group by s.nombre, a.nombre
order by s.nombre, a.nombre;

-- ============================================================
-- Para reabrir antes de que termine agosto, o si te equivocaste:
-- ============================================================
-- delete from bloqueos where motivo = 'Cierre temporal de sede - agosto 2026';
