-- ============================================================
-- AURAL · Plantilla: bloquear ESPACIOS/TURNOS ESPECÍFICOS
-- (a diferencia de bloquear el día completo)
--
-- Diferencia clave:
--   hora_inicio y hora_fin = NULL  → bloquea TODO el día
--   hora_inicio y hora_fin = con valor → bloquea SOLO ese rango de horas
--
-- Este archivo es un EJEMPLO usando el calendario de Javeriana que
-- mandaste, para que veas el patrón. No lo corras tal cual si no
-- quieres afectar a Javeriana ahora mismo — cámbialo por tus propios
-- audiólogos, fechas y horas cuando lo necesites.
-- ============================================================

-- Ejemplo: cerrar el turno AM de Viviana (7:30-1:00pm) el lunes 3 de agosto,
-- dejando libre el turno PM de Carolina ese mismo día.

insert into bloqueos (audiologo_id, fecha, hora_inicio, hora_fin, motivo)
select a.id, '2026-08-03', '07:30', '13:00', 'Espacio cerrado'
from audiologos a
where a.nombre = 'Viviana';

-- Puedes cargar varios de una vez con una lista de valores, igual que
-- hicimos con el calendario rotativo. Ejemplo con varios espacios sueltos:

insert into bloqueos (audiologo_id, fecha, hora_inicio, hora_fin, motivo)
select a.id, v.fecha::date, v.hora_inicio::time, v.hora_fin::time, 'Espacio cerrado'
from (values
  ('Viviana',  '2026-08-03', '07:30', '13:00'),  -- AM lunes 3
  ('Carolina', '2026-08-05', '13:00', '17:00'),  -- PM miércoles 5
  ('Angela',   '2026-08-06', '13:00', '17:00')   -- PM jueves 6
) as v(nombre, fecha, hora_inicio, hora_fin)
join audiologos a on a.nombre = v.nombre;

-- ============================================================
-- Verificación: revisa qué espacios quedaron bloqueados
-- ============================================================
select a.nombre as audiologo, b.fecha, b.hora_inicio, b.hora_fin, b.motivo
from bloqueos b
join audiologos a on a.id = b.audiologo_id
where b.motivo = 'Espacio cerrado'
order by b.fecha, b.hora_inicio;

-- ============================================================
-- Para quitar uno de estos bloqueos puntuales más adelante:
-- ============================================================
-- delete from bloqueos
-- where motivo = 'Espacio cerrado'
--   and fecha = '2026-08-03'
--   and audiologo_id = (select id from audiologos where nombre = 'Viviana');
