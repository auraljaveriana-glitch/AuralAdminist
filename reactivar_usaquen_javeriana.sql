-- ============================================================
-- AURAL · Reactivar Usaquén y Javeriana para agosto y septiembre
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Reactiva las dos sedes
update sedes
set activa = true
where nombre ilike '%usaqu%' or nombre ilike '%javeriana%';

-- 2. Quita el cierre de todo agosto que les habíamos puesto
delete from bloqueos
where motivo = 'Cierre temporal de sede - agosto 2026';

-- 3. Javeriana (Viviana, Carolina, Angela): quita el calendario rotativo
-- de agosto (turnos AM/PM sueltos) — de ahora en adelante van a usar
-- el mismo horario estándar recurrente que las demás sedes.
delete from horarios_fecha
where audiologo_id in (
  select id from audiologos where nombre in ('Viviana', 'Carolina', 'Angela')
);

-- Por si acaso ya tenían algo cargado en horarios_disponibles, lo limpia
-- antes de volver a crear (para no duplicar)
delete from horarios_disponibles
where audiologo_id in (
  select id from audiologos where nombre in ('Viviana', 'Carolina', 'Angela')
);

-- 4. Les da el horario estándar: L-J 7:30am-12pm y 1pm-5pm (con almuerzo),
-- V 7:30am-12pm y 1pm-4:30pm — igual que el resto de sedes.
-- Como esto es un horario RECURRENTE por día de la semana (no por fecha
-- exacta), aplica automáticamente para agosto, septiembre y en adelante,
-- sin que tengas que repetirlo mes a mes.

insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '07:30', '12:00', 30
from audiologos a, generate_series(1, 4) as dia
where a.nombre in ('Viviana', 'Carolina', 'Angela');

insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '13:00', '17:00', 30
from audiologos a, generate_series(1, 4) as dia
where a.nombre in ('Viviana', 'Carolina', 'Angela');

insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, 5, '07:30', '12:00', 30
from audiologos a
where a.nombre in ('Viviana', 'Carolina', 'Angela');

insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, 5, '13:00', '16:30', 30
from audiologos a
where a.nombre in ('Viviana', 'Carolina', 'Angela');

-- ============================================================
-- Verificación
-- ============================================================

-- Confirma que ambas sedes quedaron activas
select nombre, ciudad, activa
from sedes
where nombre ilike '%usaqu%' or nombre ilike '%javeriana%';

-- Confirma que ya no quedan bloqueos de cierre de agosto
select count(*) as bloqueos_restantes
from bloqueos
where motivo = 'Cierre temporal de sede - agosto 2026';

-- Confirma el horario nuevo de Viviana, Carolina y Angela
select a.nombre as audiologo, hd.dia_semana, hd.hora_inicio, hd.hora_fin
from horarios_disponibles hd
join audiologos a on a.id = hd.audiologo_id
where a.nombre in ('Viviana', 'Carolina', 'Angela')
order by a.nombre, hd.dia_semana, hd.hora_inicio;
